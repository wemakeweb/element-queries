(function (exports) {
  var str_trim = String.prototype.trim,
    trim = String.prototype.trim ? function (text) {
      return text == null ? "" : str_trim.call(text);
    } : function (text) {
      return text == null ? "" : (text + "").replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
    };

  function parseMediaBlocks(css) {
    var mediaBlocks = [];
    var start = 0;

    while ((start = css.indexOf("@media", start)) > -1) {

      // stack to manage brackets
      var s = [];
      // get the first opening bracket
      var i = css.indexOf("{", start),
        beginBlock = i + 1;

      //find the features substr from start minues the 6 "@media" characters
      var features = css.substr(start + 6, i - (start + 6));

      // if $i is false, then there is probably a css syntax error
      if (i > -1) {
        // push bracket onto stack
        s.push(css[i]);

        // move past first bracket
        i++;

        while (s.length != 0) {
          // if the character is an opening bracket, push it onto the stack, otherwise pop the stack
          if (css[i] == "{") {
            s.push("{");
          } else if (css[i] == "}") {
            s.pop();
          }

          i++;
        }
        //format
        var featuresArr = features.split("and");
        features = {};

        for (var fi = featuresArr.length - 1; fi >= 0; fi--) {
          var feature = trim(featuresArr[fi]);

          if (feature.charAt(0) === "(") {
            feature = feature.replace(/(\(|\))/g, "").split(/\:/g);
          } else {
            feature = feature.split(' ');
          }

          features[feature[0]] = trim(feature[1]);
        }

        // cut the media block out of the css and store with features
        mediaBlocks.push({
          features: features,
          body: css.substr(beginBlock, (i - 1) - beginBlock)
        });

        // set the new start to the end of the block
        start = i;
      }
    }

    return mediaBlocks;
  }

  function matches(query, element) {
    var width = $(element).outerWidth(),
      height = $(element).outerHeight();

    if (query["element-min-width"] && width <= parseInt(query["element-min-width"])) {
      return false
    }

    if (query["element-max-width"] && width >= parseInt(query["element-max-width"])) {
      return false
    }

    if (query["element-width"] && width != parseInt(query["element-width"])) {
      return false
    }

    if (query["element-min-height"] && height <= parseInt(query["element-min-height"])) {
      return false
    }


    if (query["element-max-height"] && height >= parseInt(query["element-max-height"])) {
      return false
    }

    if (query["element-height"] && height != parseInt(query["element-height"])) {
      return false
    }
    return true;
  }

  function applyStyle(css, element) {
    var rules = cssParser(css).stylesheet.rules,
      l = rules.length,
      apply = {};

    while (l--) {
      var curRule = rules[l].declarations;
      for (var i = curRule.length - 1; i >= 0; i--) {
        apply[curRule[i].property] = curRule[i].value;
      }
    }

    setStyle(element, apply);
  };

  function setStyle(element, css) {
    for (var property in css) {
      element.style[property] = css[property];
    }
  };


  function parse(styleTags) {
    var styleTags = styleTags || document.getElementsByTagName("style"),
      len = styleTags.length;

    while (len--) {
      var media = parseMediaBlocks(styleTags[len].innerHTML);

      for (var tag in media) {
        if (media[tag].features.element) {

          //we lockup the elements that match
          var query = media[tag].features,
            elements = document.querySelectorAll(query.element),
            elements_len = elements.length;

          while (elements_len--) {
            if (matches(query, elements[elements_len])) {
              applyStyle(media[tag].body, elements[elements_len]);
            }
          }
        }
      }
    }
  }



  function cssParser(css) {

    /**
     * Parse stylesheet.
     */

    function stylesheet() {
      return {
        stylesheet: {
          rules: rules()
        }
      };
    }

    /**
     * Opening brace.
     */

    function open() {
      return match(/^{\s*/);
    }

    /**
     * Closing brace.
     */

    function close() {
      return match(/^}\s*/);
    }

    /**
     * Parse ruleset.
     */

    function rules() {
      var node;
      var rules = [];
      whitespace();
      comments(rules);
      while (css[0] != '}' && (node = atrule() || rule())) {
        rules.push(node);
        comments(rules);
      }
      return rules;
    }

    /**
     * Match `re` and return captures.
     */

    function match(re) {
      var m = re.exec(css);
      if (!m) return;
      css = css.slice(m[0].length);
      return m;
    }

    /**
     * Parse whitespace.
     */

    function whitespace() {
      match(/^\s*/);
    }

    /**
     * Parse comments;
     */

    function comments(rules) {
      rules = rules || [];
      var c;
      while (c = comment()) rules.push(c);
      return rules;
    }

    /**
     * Parse comment.
     */

    function comment() {
      if ('/' == css[0] && '*' == css[1]) {
        var i = 2;
        while ('*' != css[i] || '/' != css[i + 1])++i;
        i += 2;
        var comment = css.slice(2, i - 2);
        css = css.slice(i);
        whitespace();
        return {
          comment: comment
        };
      }
    }

    /**
     * Parse selector.
     */

    function selector() {
      var m = match(/^([^{]+)/);
      if (!m) return;
      return m[0].trim().split(/\s*,\s*/);
    }

    /**
     * Parse declaration.
     */

    function declaration() {
      // prop
      var prop = match(/^(\*?[-\w]+)\s*/);
      if (!prop) return;
      prop = prop[0];

      // :
      if (!match(/^:\s*/)) return;

      // val
      var val = match(/^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+)\s*/);
      if (!val) return;
      val = val[0].trim();

      // ;
      match(/^[;\s]*/);

      return {
        property: prop,
        value: val
      };
    }

    /**
     * Parse keyframe.
     */

    function keyframe() {
      var m;
      var vals = [];

      while (m = match(/^(from|to|\d+%|\.\d+%|\d+\.\d+%)\s*/)) {
        vals.push(m[1]);
        match(/^,\s*/);
      }

      if (!vals.length) return;

      return {
        values: vals,
        declarations: declarations()
      };
    }

    /**
     * Parse keyframes.
     */

    function keyframes() {
      var m = match(/^@([-\w]+)?keyframes */);
      if (!m) return;
      var vendor = m[1];

      // identifier
      var m = match(/^([-\w]+)\s*/);
      if (!m) return;
      var name = m[1];

      if (!open()) return;
      comments();

      var frame;
      var frames = [];
      while (frame = keyframe()) {
        frames.push(frame);
        comments();
      }

      if (!close()) return;

      return {
        name: name,
        vendor: vendor,
        keyframes: frames
      };
    }

    /**
     * Parse supports.
     */

    function supports() {
      var m = match(/^@supports *([^{]+)/);
      if (!m) return;
      var supports = m[1].trim();

      if (!open()) return;
      comments();

      var style = rules();

      if (!close()) return;

      return {
        supports: supports,
        rules: style
      };
    }

    /**
     * Parse media.
     */

    function media() {
      var m = match(/^@media *([^{]+)/);
      if (!m) return;
      var media = m[1].trim();

      if (!open()) return;
      comments();

      var style = rules();

      if (!close()) return;

      return {
        media: media,
        rules: style
      };
    }

    /**
     * Parse paged media.
     */

    function atpage() {
      var m = match(/^@page */);
      if (!m) return;

      var sel = selector() || [];
      var decls = [];

      if (!open()) return;
      comments();

      // declarations
      var decl;
      while (decl = declaration() || atmargin()) {
        decls.push(decl);
        comments();
      }

      if (!close()) return;

      return {
        type: "page",
        selectors: sel,
        declarations: decls
      };
    }

    /**
     * Parse margin at-rules
     */

    function atmargin() {
      var m = match(/^@([a-z\-]+) */);
      if (!m) return;
      var type = m[1]

      return {
        type: type,
        declarations: declarations()
      }
    }

    /**
     * Parse import
     */

    function atimport() {
      return _atrule('import')
    }

    /**
     * Parse charset
     */

    function atcharset() {
      return _atrule('charset');
    }

    /**
     * Parse namespace
     */

    function atnamespace() {
      return _atrule('namespace')
    }

    /**
     * Parse non-block at-rules
     */

    function _atrule(name) {
      var m = match(new RegExp('^@' + name + ' *([^;\\n]+);\\s*'));
      if (!m) return;
      var ret = {}
      ret[name] = m[1].trim();
      return ret;
    }

    /**
     * Parse declarations.
     */

    function declarations() {
      var decls = [];

      if (!open()) return;
      comments();

      // declarations
      var decl;
      while (decl = declaration()) {
        decls.push(decl);
        comments();
      }

      if (!close()) return;
      return decls;
    }

    /**
     * Parse at rule.
     */

    function atrule() {
      return keyframes() || media() || supports() || atimport() || atcharset() || atnamespace() || atpage();
    }

    /**
     * Parse rule.
     */

    function rule() {
      var sel = selector();
      if (!sel) return;
      comments();
      return {
        selectors: sel,
        declarations: declarations()
      };
    }

    return stylesheet();
  };


  exports.cssParser = cssParser;
  exports.parse = parse;

  return exports;

})((elementQueries = {}));