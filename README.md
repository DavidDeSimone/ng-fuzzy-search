# ng-fuzzy-search

This is a fuzzy-search module for [emacs-ng](https://github.com/emacs-ng/emacs-ng) . Usage:

`M-x fuzzy-search RET FILENAME`

This will fuzzy-search for a pattern. By default, it will use the current directory. To set it to a different directory, use

`M-x fuzzy-search-set-basedir RET DIR`

To use with emacs-ng, just include this line in your init.el:

```lisp
(eval-js "import 'https://deno.land/x/fuzzy_search@0.3.0/mod-fuzzy.js'")
```
