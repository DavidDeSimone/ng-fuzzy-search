import { fuzzyMatch } from "https://deno.land/x/fuzzy_search@0.1.0/fuzzy-search.js";
import { walk, walkSync } from "https://deno.land/std@0.83.0/fs/mod.ts";

const find = (data) => {
    let { msgId, pattern, dir } = data.data;

    if (dir[0] == "~") {
	const home = Deno.env.get("HOME") || "/home";
	dir = dir.replace("~", home);
    }

    let rank = [];
    for (const entry of walkSync(dir)) {
	const search = fuzzyMatch(pattern, entry.path);
	if (search[0] === true && entry.isFile === true) {
	    search[0] = entry;
	    rank.push(search);
	}
    }

    rank.sort((a, b) => {
	let x = a[1];
	let y = b[1];

	if (x < y) {
	    return 1;
	} else if (x > y) {
	    return -1;
	} else {
	    return 0;
	}
    });

    return { responseMsgId: msgId, rank };
};

self.onmessage = (data) => {
    try {
	const msg = find(data);
	self.postMessage(msg);
    } catch (error) {
	self.postMessage({ responseMsgId: data.data.msgId, error });
    }
};
