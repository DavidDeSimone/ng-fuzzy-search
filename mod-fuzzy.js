const TEXT_COLOR = "green";
let BASEDIR = './';
let MAX_RESULTS = 50;

let workerActive = false;
let msgId = 0;
let worker = null;
const pendingPromises = {};
export function fuzzySearchAsync(pattern, dir = BASEDIR) {
    if (!workerActive) {
	workerActive = true;
	worker = new Worker(new URL("mod-fuzzy-worker.js#1", import.meta.url).href,
				{
				    type: "module",
				    deno: true,
				});

	worker.onmessage = function (result) {
	    const { responseMsgId, rank, error } = result.data;
	    const promise = pendingPromises[responseMsgId];
	    if (error) {
		promise.reject(error);
		return;
	    }

	    promise.resolve(rank);
	    pendingPromises[responseMsgId] = null;
	}
    }

    return new Promise((resolve, reject) => {
	msgId += 1;
	pendingPromises[msgId] = {resolve, reject};
	worker.postMessage({ msgId, pattern, dir  });
    });
}

export function setFuzzySearchDirectory(dir) {
    BASEDIR = dir;
}

export function setFuzzySearchMaxResults(n) {
    MAX_RESULTS = n;
}

lisp.defun({
    name: "fuzzy-search-set-basedir",
    interactive: true,
    func: () => {
	const base = lisp.read_directory_name("Fuzzy Base Dir: ");
	setFuzzySearchDirectory(base);
    }
});

lisp.defun({
    name: "fuzzy-search-set-max-results",
    interactive: true,
    args: "nNew Value ",
    func: (n) => { setFuzzySearchMaxResults(n) }
});

const setTextColor = (min, max, strSymbol, color) => {
    return lisp.add_text_properties(min, max, lisp.list(lisp.q.font_lock_face,
						 lisp.list(lisp.keywords.foreground,
							   color)), strSymbol);
};

lisp.defun({
    name: "fuzzy-find-file",
    interactive: true,
    func: () => {
	let s = lisp.line_beginning_position();
	let e = lisp.line_end_position();
	lisp.find_file(lisp.buffer_substring(s, e));
    }
});


lisp.defvar(lisp.symbols.fuzzy_mode_keymap,
	    lisp.make_keymap(),
	    "keymap");

lisp.define_key(lisp.symbols.fuzzy_mode_keymap,
		lisp.kbd("RET"),
		lisp.quote(lisp.symbols.fuzzy_find_file));

lisp.define_minor_mode(lisp.symbols.fuzzy_mode,
		       "Mode used for interacting with fuzzy search results",
		       lisp.symbols.nil,
		       "Fuzzy",
		       lisp.keywords.keymap,
		       lisp.symbols.fuzzy_mode_keymap);

lisp.defun({
    name: "fuzzy-search",
    interactive: true,
    args: "MInput >> ",
    func: (str) => {
	fuzzySearchAsync(str)
	    .then((results) => {
		// falling back due to older version of emacs-ng
		const makeString = lisp.make.string || lisp_string;
		const currentBuffer = lisp.current_buffer();
		const resultBuffer = lisp.get_buffer_create('*Fuzzy Search*');
		if (!lisp.eq(resultBuffer, currentBuffer)) {
		    lisp.switch_to_buffer_other_window(resultBuffer);
		}

		lisp.tabulated_list_mode();
		lisp.fuzzy_mode();

		const columns = lisp.make.list(
		    [`Results for "${str}"; Base Directory ${BASEDIR}`, 0, lisp.q.nil],
		);
		lisp.setq(lisp.symbols.tabulated_list_format, lisp.make.array([columns]));
		const filtered = [];
		let b = null;
		for (let i = 0; i < Math.min(MAX_RESULTS, results.length); ++i) {
		    let name = results[i][0].path;
		    let idxs = results[i][2];
		    const str = makeString(name);

		    let currentRange = idxs[0];
		    for (let j = 0; j < idxs.length; ++j) {
			if (j === idxs.length - 1) {
			    setTextColor(currentRange, idxs[j] + 1, str, TEXT_COLOR);
			} else if (idxs[j + 1] - idxs[j] !== 1) {
			    setTextColor(currentRange, idxs[j] + 1, str, TEXT_COLOR);
			    currentRange = idxs[j + 1];
			}
		    }

		    let namevec = lisp.make.array([str]);
		    filtered.push(lisp.make.list([lisp.q.nil, namevec]));
		}

		const data = lisp.list(...filtered);
		lisp.setq(lisp.symbols.tabulated_list_entries, data);
		lisp.tabulated_list_init_header();
		lisp.tabulated_list_print();
	    });
    }
});
