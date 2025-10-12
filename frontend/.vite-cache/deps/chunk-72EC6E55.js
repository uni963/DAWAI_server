import {
  __export
} from "./chunk-V4OQ3NZ2.js";

// node_modules/tonal-array/build/es6.js
var es6_exports2 = {};
__export(es6_exports2, {
  compact: () => compact,
  permutations: () => permutations,
  range: () => range,
  rotate: () => rotate,
  shuffle: () => shuffle,
  sort: () => sort,
  unique: () => unique
});

// node_modules/tonal-note/build/es6.js
var es6_exports = {};
__export(es6_exports, {
  altToAcc: () => altToAcc,
  build: () => build,
  chroma: () => chroma,
  enharmonic: () => enharmonic,
  freq: () => freq,
  freqToMidi: () => freqToMidi,
  from: () => from,
  fromMidi: () => fromMidi,
  midi: () => midi,
  midiToFreq: () => midiToFreq,
  name: () => name,
  names: () => names,
  oct: () => oct,
  pc: () => pc,
  props: () => props,
  simplify: () => simplify,
  stepToLetter: () => stepToLetter,
  tokenize: () => tokenize
});
var NAMES = "C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B".split(" ");
var names = function(accTypes) {
  return typeof accTypes !== "string" ? NAMES.slice() : NAMES.filter(function(n) {
    var acc = n[1] || " ";
    return accTypes.indexOf(acc) !== -1;
  });
};
var SHARPS = names(" #");
var FLATS = names(" b");
var REGEX = /^([a-gA-G]?)(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)$/;
function tokenize(str) {
  if (typeof str !== "string")
    str = "";
  var m = REGEX.exec(str);
  return [m[1].toUpperCase(), m[2].replace(/x/g, "##"), m[3], m[4]];
}
var NO_NOTE = Object.freeze({
  pc: null,
  name: null,
  step: null,
  alt: null,
  oct: null,
  octStr: null,
  chroma: null,
  midi: null,
  freq: null
});
var SEMI = [0, 2, 4, 5, 7, 9, 11];
var properties = function(str) {
  var tokens = tokenize(str);
  if (tokens[0] === "" || tokens[3] !== "")
    return NO_NOTE;
  var letter = tokens[0], acc = tokens[1], octStr = tokens[2];
  var p = {
    letter,
    acc,
    octStr,
    pc: letter + acc,
    name: letter + acc + octStr,
    step: (letter.charCodeAt(0) + 3) % 7,
    alt: acc[0] === "b" ? -acc.length : acc.length,
    oct: octStr.length ? +octStr : null,
    chroma: 0,
    midi: null,
    freq: null
  };
  p.chroma = (SEMI[p.step] + p.alt + 120) % 12;
  p.midi = p.oct !== null ? SEMI[p.step] + p.alt + 12 * (p.oct + 1) : null;
  p.freq = midiToFreq(p.midi);
  return Object.freeze(p);
};
var memo = function(fn, cache2) {
  if (cache2 === void 0) {
    cache2 = {};
  }
  return function(str) {
    return cache2[str] || (cache2[str] = fn(str));
  };
};
var props = memo(properties);
var name = function(str) {
  return props(str).name;
};
var pc = function(str) {
  return props(str).pc;
};
var isMidiRange = function(m) {
  return m >= 0 && m <= 127;
};
var midi = function(note2) {
  if (typeof note2 !== "number" && typeof note2 !== "string") {
    return null;
  }
  var midi3 = props(note2).midi;
  var value = midi3 || midi3 === 0 ? midi3 : +note2;
  return isMidiRange(value) ? value : null;
};
var midiToFreq = function(midi3, tuning) {
  if (tuning === void 0) {
    tuning = 440;
  }
  return typeof midi3 === "number" ? Math.pow(2, (midi3 - 69) / 12) * tuning : null;
};
var freq = function(note2) {
  return props(note2).freq || midiToFreq(note2);
};
var L2 = Math.log(2);
var L440 = Math.log(440);
var freqToMidi = function(freq3) {
  var v = 12 * (Math.log(freq3) - L440) / L2 + 69;
  return Math.round(v * 100) / 100;
};
var chroma = function(str) {
  return props(str).chroma;
};
var oct = function(str) {
  return props(str).oct;
};
var LETTERS = "CDEFGAB";
var stepToLetter = function(step) {
  return LETTERS[step];
};
var fillStr = function(s, n) {
  return Array(n + 1).join(s);
};
var numToStr = function(num2, op) {
  return typeof num2 !== "number" ? "" : op(num2);
};
var altToAcc = function(alt) {
  return numToStr(alt, function(alt2) {
    return alt2 < 0 ? fillStr("b", -alt2) : fillStr("#", alt2);
  });
};
var from = function(fromProps, baseNote) {
  if (fromProps === void 0) {
    fromProps = {};
  }
  if (baseNote === void 0) {
    baseNote = null;
  }
  var _a = baseNote ? Object.assign({}, props(baseNote), fromProps) : fromProps, step = _a.step, alt = _a.alt, oct2 = _a.oct;
  if (typeof step !== "number")
    return null;
  var letter = stepToLetter(step);
  if (!letter)
    return null;
  var pc2 = letter + altToAcc(alt);
  return oct2 || oct2 === 0 ? pc2 + oct2 : pc2;
};
var build = from;
function fromMidi(num2, sharps) {
  if (sharps === void 0) {
    sharps = false;
  }
  num2 = Math.round(num2);
  var pcs = sharps === true ? SHARPS : FLATS;
  var pc2 = pcs[num2 % 12];
  var o = Math.floor(num2 / 12) - 1;
  return pc2 + o;
}
var simplify = function(note2, sameAcc) {
  if (sameAcc === void 0) {
    sameAcc = true;
  }
  var _a = props(note2), alt = _a.alt, chroma4 = _a.chroma, midi3 = _a.midi;
  if (chroma4 === null)
    return null;
  var alteration = alt;
  var useSharps = sameAcc === false ? alteration < 0 : alteration > 0;
  return midi3 === null ? pc(fromMidi(chroma4, useSharps)) : fromMidi(midi3, useSharps);
};
var enharmonic = function(note2) {
  return simplify(note2, false);
};

// node_modules/tonal-array/build/es6.js
function ascR(b, n) {
  for (var a = []; n--; a[n] = n + b) {
    ;
  }
  return a;
}
function descR(b, n) {
  for (var a = []; n--; a[n] = b - n) {
    ;
  }
  return a;
}
function range(a, b) {
  return a === null || b === null ? [] : a < b ? ascR(a, b - a + 1) : descR(a, a - b + 1);
}
function rotate(times, arr) {
  var len = arr.length;
  var n = (times % len + len) % len;
  return arr.slice(n, len).concat(arr.slice(0, n));
}
var compact = function(arr) {
  return arr.filter(function(n) {
    return n === 0 || n;
  });
};
var height = function(name3) {
  var m = props(name3).midi;
  return m !== null ? m : props(name3 + "-100").midi;
};
function sort(src) {
  return compact(src.map(name)).sort(function(a, b) {
    return height(a) > height(b);
  });
}
function unique(arr) {
  return sort(arr).filter(function(n, i, a) {
    return i === 0 || n !== a[i - 1];
  });
}
var shuffle = function(arr, rnd) {
  if (rnd === void 0) rnd = Math.random;
  var i, t;
  var m = arr.length;
  while (m) {
    i = rnd() * m-- | 0;
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
};
var permutations = function(arr) {
  if (arr.length === 0) {
    return [[]];
  }
  return permutations(arr.slice(1)).reduce(function(acc, perm) {
    return acc.concat(
      arr.map(function(e, pos) {
        var newPerm = perm.slice();
        newPerm.splice(pos, 0, arr[0]);
        return newPerm;
      })
    );
  }, []);
};

// node_modules/tonal-interval/build/es6.js
var es6_exports3 = {};
__export(es6_exports3, {
  altToQ: () => altToQ,
  build: () => build2,
  chroma: () => chroma2,
  fromSemitones: () => fromSemitones,
  ic: () => ic,
  invert: () => invert,
  name: () => name2,
  names: () => names2,
  num: () => num,
  props: () => props2,
  qToAlt: () => qToAlt,
  semitones: () => semitones,
  simplify: () => simplify2,
  tokenize: () => tokenize2
});
var IVL_TNL = "([-+]?\\d+)(d{1,4}|m|M|P|A{1,4})";
var IVL_STR = "(AA|A|P|M|m|d|dd)([-+]?\\d+)";
var REGEX2 = new RegExp("^" + IVL_TNL + "|" + IVL_STR + "$");
var SIZES = [0, 2, 4, 5, 7, 9, 11];
var TYPES = "PMMPPMM";
var CLASSES = [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
var NAMES2 = "1P 2m 2M 3m 3M 4P 5P 6m 6M 7m 7M 8P".split(" ");
var names2 = function(types) {
  return typeof types !== "string" ? NAMES2.slice() : NAMES2.filter(function(n) {
    return types.indexOf(n[1]) !== -1;
  });
};
var tokenize2 = function(str) {
  var m = REGEX2.exec("" + str);
  if (m === null)
    return null;
  return m[1] ? [m[1], m[2]] : [m[4], m[3]];
};
var NO_IVL = Object.freeze({
  name: null,
  num: null,
  q: null,
  step: null,
  alt: null,
  dir: null,
  type: null,
  simple: null,
  semitones: null,
  chroma: null,
  oct: null
});
var fillStr2 = function(s, n) {
  return Array(Math.abs(n) + 1).join(s);
};
var qToAlt = function(type, q) {
  if (q === "M" && type === "M")
    return 0;
  if (q === "P" && type === "P")
    return 0;
  if (q === "m" && type === "M")
    return -1;
  if (/^A+$/.test(q))
    return q.length;
  if (/^d+$/.test(q))
    return type === "P" ? -q.length : -q.length - 1;
  return null;
};
var altToQ = function(type, alt) {
  if (alt === 0)
    return type === "M" ? "M" : "P";
  else if (alt === -1 && type === "M")
    return "m";
  else if (alt > 0)
    return fillStr2("A", alt);
  else if (alt < 0)
    return fillStr2("d", type === "P" ? alt : alt + 1);
  else
    return null;
};
var numToStep = function(num2) {
  return (Math.abs(num2) - 1) % 7;
};
var properties2 = function(str) {
  var t = tokenize2(str);
  if (t === null)
    return NO_IVL;
  var p = {
    num: 0,
    q: "d",
    name: "",
    type: "M",
    step: 0,
    dir: -1,
    simple: 1,
    alt: 0,
    oct: 0,
    semitones: 0,
    chroma: 0,
    ic: 0
  };
  p.num = +t[0];
  p.q = t[1];
  p.step = numToStep(p.num);
  p.type = TYPES[p.step];
  if (p.type === "M" && p.q === "P")
    return NO_IVL;
  p.name = "" + p.num + p.q;
  p.dir = p.num < 0 ? -1 : 1;
  p.simple = p.num === 8 || p.num === -8 ? p.num : p.dir * (p.step + 1);
  p.alt = qToAlt(p.type, p.q);
  p.oct = Math.floor((Math.abs(p.num) - 1) / 7);
  p.semitones = p.dir * (SIZES[p.step] + p.alt + 12 * p.oct);
  p.chroma = (p.dir * (SIZES[p.step] + p.alt) % 12 + 12) % 12;
  return Object.freeze(p);
};
var cache = {};
function props2(str) {
  if (typeof str !== "string")
    return NO_IVL;
  return cache[str] || (cache[str] = properties2(str));
}
var num = function(str) {
  return props2(str).num;
};
var name2 = function(str) {
  return props2(str).name;
};
var semitones = function(str) {
  return props2(str).semitones;
};
var chroma2 = function(str) {
  return props2(str).chroma;
};
var ic = function(ivl) {
  if (typeof ivl === "string")
    ivl = props2(ivl).chroma;
  return typeof ivl === "number" ? CLASSES[ivl % 12] : null;
};
var build2 = function(_a) {
  var _b = _a === void 0 ? {} : _a, num2 = _b.num, step = _b.step, alt = _b.alt, _c = _b.oct, oct2 = _c === void 0 ? 1 : _c, dir = _b.dir;
  if (step !== void 0)
    num2 = step + 1 + 7 * oct2;
  if (num2 === void 0)
    return null;
  if (typeof alt !== "number")
    return null;
  var d = typeof dir !== "number" ? "" : dir < 0 ? "-" : "";
  var type = TYPES[numToStep(num2)];
  return d + num2 + altToQ(type, alt);
};
var simplify2 = function(str) {
  var p = props2(str);
  if (p === NO_IVL)
    return null;
  var intervalProps = p;
  return intervalProps.simple + intervalProps.q;
};
var invert = function(str) {
  var p = props2(str);
  if (p === NO_IVL)
    return null;
  var intervalProps = p;
  var step = (7 - intervalProps.step) % 7;
  var alt = intervalProps.type === "P" ? -intervalProps.alt : -(intervalProps.alt + 1);
  return build2({ step, alt, oct: intervalProps.oct, dir: intervalProps.dir });
};
var IN = [1, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7, 7];
var IQ = "P m M m M P d P m M m M".split(" ");
var fromSemitones = function(num2) {
  var d = num2 < 0 ? -1 : 1;
  var n = Math.abs(num2);
  var c = n % 12;
  var o = Math.floor(n / 12);
  return d * (IN[c] + 7 * o) + IQ[c];
};

// node_modules/tonal-distance/build/es6.js
var es6_exports4 = {};
__export(es6_exports4, {
  add: () => add,
  addIntervals: () => addIntervals,
  fifths: () => fifths,
  interval: () => interval,
  semitones: () => semitones2,
  subtract: () => subtract,
  trFifths: () => trFifths,
  transpose: () => transpose,
  transposeBy: () => transposeBy
});
var FIFTHS = [0, 2, 4, -1, 1, 3, 5];
var fOcts = function(f) {
  return Math.floor(f * 7 / 12);
};
var FIFTH_OCTS = FIFTHS.map(fOcts);
var encode = function(ref) {
  var step = ref.step;
  var alt = ref.alt;
  var oct2 = ref.oct;
  var dir = ref.dir;
  if (dir === void 0) dir = 1;
  var f = FIFTHS[step] + 7 * alt;
  if (oct2 === null) {
    return [dir * f];
  }
  var o = oct2 - FIFTH_OCTS[step] - 4 * alt;
  return [dir * f, dir * o];
};
var STEPS = [3, 0, 4, 1, 5, 2, 6];
function unaltered(f) {
  var i = (f + 1) % 7;
  return i < 0 ? 7 + i : i;
}
var decode = function(f, o, dir) {
  var step = STEPS[unaltered(f)];
  var alt = Math.floor((f + 1) / 7);
  if (o === void 0) {
    return { step, alt, dir };
  }
  var oct2 = o + 4 * alt + FIFTH_OCTS[step];
  return { step, alt, oct: oct2, dir };
};
var memo2 = function(fn, cache2) {
  if (cache2 === void 0) cache2 = {};
  return function(str) {
    return cache2[str] || (cache2[str] = fn(str));
  };
};
var encoder = function(props5) {
  return memo2(function(str) {
    var p = props5(str);
    return p.name === null ? null : encode(p);
  });
};
var encodeNote = encoder(props);
var encodeIvl = encoder(props2);
function transpose(note2, interval3) {
  if (arguments.length === 1) {
    return function(i2) {
      return transpose(note2, i2);
    };
  }
  var n = encodeNote(note2);
  var i = encodeIvl(interval3);
  if (n === null || i === null) {
    return null;
  }
  var tr = n.length === 1 ? [n[0] + i[0]] : [n[0] + i[0], n[1] + i[1]];
  return build(decode(tr[0], tr[1]));
}
function trFifths(note2, fifths2) {
  if (arguments.length === 1) {
    return function(f) {
      return trFifths(note2, f);
    };
  }
  var n = encodeNote(note2);
  if (n === null) {
    return null;
  }
  return build(decode(n[0] + fifths2));
}
function fifths(from2, to) {
  if (arguments.length === 1) {
    return function(to2) {
      return fifths(from2, to2);
    };
  }
  var f = encodeNote(from2);
  var t = encodeNote(to);
  if (t === null || f === null) {
    return null;
  }
  return t[0] - f[0];
}
function transposeBy(interval3, note2) {
  if (arguments.length === 1) {
    return function(n) {
      return transpose(n, interval3);
    };
  }
  return transpose(note2, interval3);
}
var isDescending = function(e) {
  return e[0] * 7 + e[1] * 12 < 0;
};
var decodeIvl = function(i) {
  return isDescending(i) ? decode(-i[0], -i[1], -1) : decode(i[0], i[1], 1);
};
function addIntervals(ivl1, ivl2, dir) {
  var i1 = encodeIvl(ivl1);
  var i2 = encodeIvl(ivl2);
  if (i1 === null || i2 === null) {
    return null;
  }
  var i = [i1[0] + dir * i2[0], i1[1] + dir * i2[1]];
  return build2(decodeIvl(i));
}
function add(ivl1, ivl2) {
  if (arguments.length === 1) {
    return function(i2) {
      return add(ivl1, i2);
    };
  }
  return addIntervals(ivl1, ivl2, 1);
}
function subtract(ivl1, ivl2) {
  if (arguments.length === 1) {
    return function(i2) {
      return add(ivl1, i2);
    };
  }
  return addIntervals(ivl1, ivl2, -1);
}
function interval(from2, to) {
  if (arguments.length === 1) {
    return function(t2) {
      return interval(from2, t2);
    };
  }
  var f = encodeNote(from2);
  var t = encodeNote(to);
  if (f === null || t === null || f.length !== t.length) {
    return null;
  }
  var d = f.length === 1 ? [t[0] - f[0], -Math.floor((t[0] - f[0]) * 7 / 12)] : [t[0] - f[0], t[1] - f[1]];
  return build2(decodeIvl(d));
}
function semitones2(from2, to) {
  if (arguments.length === 1) {
    return function(t2) {
      return semitones2(from2, t2);
    };
  }
  var f = props(from2);
  var t = props(to);
  return f.midi !== null && t.midi !== null ? t.midi - f.midi : f.chroma !== null && t.chroma !== null ? (t.chroma - f.chroma + 12) % 12 : null;
}

// node_modules/tonal-dictionary/build/es6.js
var es6_exports6 = {};
__export(es6_exports6, {
  chord: () => chord,
  combine: () => combine,
  dictionary: () => dictionary,
  pcset: () => pcset,
  scale: () => scale
});

// node_modules/tonal-dictionary/build/data/scales.json
var scales_default = {
  chromatic: ["1P 2m 2M 3m 3M 4P 4A 5P 6m 6M 7m 7M"],
  lydian: ["1P 2M 3M 4A 5P 6M 7M"],
  major: ["1P 2M 3M 4P 5P 6M 7M", ["ionian"]],
  mixolydian: ["1P 2M 3M 4P 5P 6M 7m", ["dominant"]],
  dorian: ["1P 2M 3m 4P 5P 6M 7m"],
  aeolian: ["1P 2M 3m 4P 5P 6m 7m", ["minor"]],
  phrygian: ["1P 2m 3m 4P 5P 6m 7m"],
  locrian: ["1P 2m 3m 4P 5d 6m 7m"],
  "melodic minor": ["1P 2M 3m 4P 5P 6M 7M"],
  "melodic minor second mode": ["1P 2m 3m 4P 5P 6M 7m"],
  "lydian augmented": ["1P 2M 3M 4A 5A 6M 7M"],
  "lydian dominant": ["1P 2M 3M 4A 5P 6M 7m", ["lydian b7"]],
  "melodic minor fifth mode": [
    "1P 2M 3M 4P 5P 6m 7m",
    ["hindu", "mixolydian b6M"]
  ],
  "locrian #2": ["1P 2M 3m 4P 5d 6m 7m", ["half-diminished"]],
  altered: [
    "1P 2m 3m 3M 5d 6m 7m",
    ["super locrian", "diminished whole tone", "pomeroy"]
  ],
  "harmonic minor": ["1P 2M 3m 4P 5P 6m 7M"],
  "phrygian dominant": ["1P 2m 3M 4P 5P 6m 7m", ["spanish", "phrygian major"]],
  "half-whole diminished": ["1P 2m 3m 3M 4A 5P 6M 7m", ["dominant diminished"]],
  diminished: ["1P 2M 3m 4P 5d 6m 6M 7M", ["whole-half diminished"]],
  "major pentatonic": ["1P 2M 3M 5P 6M", ["pentatonic"]],
  "lydian pentatonic": ["1P 3M 4A 5P 7M", ["chinese"]],
  "mixolydian pentatonic": ["1P 3M 4P 5P 7m", ["indian"]],
  "locrian pentatonic": [
    "1P 3m 4P 5d 7m",
    ["minor seven flat five pentatonic"]
  ],
  "minor pentatonic": ["1P 3m 4P 5P 7m"],
  "minor six pentatonic": ["1P 3m 4P 5P 6M"],
  "minor hexatonic": ["1P 2M 3m 4P 5P 7M"],
  "flat three pentatonic": ["1P 2M 3m 5P 6M", ["kumoi"]],
  "flat six pentatonic": ["1P 2M 3M 5P 6m"],
  "major flat two pentatonic": ["1P 2m 3M 5P 6M"],
  "whole tone pentatonic": ["1P 3M 5d 6m 7m"],
  "ionian pentatonic": ["1P 3M 4P 5P 7M"],
  "lydian #5P pentatonic": ["1P 3M 4A 5A 7M"],
  "lydian dominant pentatonic": ["1P 3M 4A 5P 7m"],
  "minor #7M pentatonic": ["1P 3m 4P 5P 7M"],
  "super locrian pentatonic": ["1P 3m 4d 5d 7m"],
  "in-sen": ["1P 2m 4P 5P 7m"],
  iwato: ["1P 2m 4P 5d 7m"],
  hirajoshi: ["1P 2M 3m 5P 6m"],
  kumoijoshi: ["1P 2m 4P 5P 6m"],
  pelog: ["1P 2m 3m 5P 6m"],
  "vietnamese 1": ["1P 3m 4P 5P 6m"],
  "vietnamese 2": ["1P 3m 4P 5P 7m"],
  prometheus: ["1P 2M 3M 4A 6M 7m"],
  "prometheus neopolitan": ["1P 2m 3M 4A 6M 7m"],
  ritusen: ["1P 2M 4P 5P 6M"],
  scriabin: ["1P 2m 3M 5P 6M"],
  piongio: ["1P 2M 4P 5P 6M 7m"],
  "major blues": ["1P 2M 3m 3M 5P 6M"],
  "minor blues": ["1P 3m 4P 5d 5P 7m", ["blues"]],
  "composite blues": ["1P 2M 3m 3M 4P 5d 5P 6M 7m"],
  augmented: ["1P 2A 3M 5P 5A 7M"],
  "augmented heptatonic": ["1P 2A 3M 4P 5P 5A 7M"],
  "dorian #4": ["1P 2M 3m 4A 5P 6M 7m"],
  "lydian diminished": ["1P 2M 3m 4A 5P 6M 7M"],
  "whole tone": ["1P 2M 3M 4A 5A 7m"],
  "leading whole tone": ["1P 2M 3M 4A 5A 7m 7M"],
  "lydian minor": ["1P 2M 3M 4A 5P 6m 7m"],
  "locrian major": ["1P 2M 3M 4P 5d 6m 7m", ["arabian"]],
  neopolitan: ["1P 2m 3m 4P 5P 6m 7M"],
  "neopolitan minor": ["1P 2m 3m 4P 5P 6m 7M"],
  "neopolitan major": ["1P 2m 3m 4P 5P 6M 7M", ["dorian b2"]],
  "neopolitan major pentatonic": ["1P 3M 4P 5d 7m"],
  "romanian minor": ["1P 2M 3m 5d 5P 6M 7m"],
  "double harmonic lydian": ["1P 2m 3M 4A 5P 6m 7M"],
  "harmonic major": ["1P 2M 3M 4P 5P 6m 7M"],
  "double harmonic major": ["1P 2m 3M 4P 5P 6m 7M", ["gypsy"]],
  egyptian: ["1P 2M 4P 5P 7m"],
  "hungarian minor": ["1P 2M 3m 4A 5P 6m 7M"],
  "hungarian major": ["1P 2A 3M 4A 5P 6M 7m"],
  oriental: ["1P 2m 3M 4P 5d 6M 7m"],
  "spanish heptatonic": ["1P 2m 3m 3M 4P 5P 6m 7m"],
  flamenco: ["1P 2m 3m 3M 4A 5P 7m"],
  balinese: ["1P 2m 3m 4P 5P 6m 7M"],
  "todi raga": ["1P 2m 3m 4A 5P 6m 7M"],
  "malkos raga": ["1P 3m 4P 6m 7m"],
  "kafi raga": ["1P 3m 3M 4P 5P 6M 7m 7M"],
  "purvi raga": ["1P 2m 3M 4P 4A 5P 6m 7M"],
  persian: ["1P 2m 3M 4P 5d 6m 7M"],
  bebop: ["1P 2M 3M 4P 5P 6M 7m 7M"],
  "bebop dominant": ["1P 2M 3M 4P 5P 6M 7m 7M"],
  "bebop minor": ["1P 2M 3m 3M 4P 5P 6M 7m"],
  "bebop major": ["1P 2M 3M 4P 5P 5A 6M 7M"],
  "bebop locrian": ["1P 2m 3m 4P 5d 5P 6m 7m"],
  "minor bebop": ["1P 2M 3m 4P 5P 6m 7m 7M"],
  "mystery #1": ["1P 2m 3M 5d 6m 7m"],
  enigmatic: ["1P 2m 3M 5d 6m 7m 7M"],
  "minor six diminished": ["1P 2M 3m 4P 5P 6m 6M 7M"],
  "ionian augmented": ["1P 2M 3M 4P 5A 6M 7M"],
  "lydian #9": ["1P 2m 3M 4A 5P 6M 7M"],
  ichikosucho: ["1P 2M 3M 4P 5d 5P 6M 7M"],
  "six tone symmetric": ["1P 2m 3M 4P 5A 6M"]
};

// node_modules/tonal-dictionary/build/data/chords.json
var chords_default = {
  "4": ["1P 4P 7m 10m", ["quartal"]],
  "64": ["5P 8P 10M"],
  "5": ["1P 5P"],
  M: ["1P 3M 5P", ["Major", ""]],
  "M#5": ["1P 3M 5A", ["augmented", "maj#5", "Maj#5", "+", "aug"]],
  "M#5add9": ["1P 3M 5A 9M", ["+add9"]],
  M13: ["1P 3M 5P 7M 9M 13M", ["maj13", "Maj13"]],
  "M13#11": [
    "1P 3M 5P 7M 9M 11A 13M",
    ["maj13#11", "Maj13#11", "M13+4", "M13#4"]
  ],
  M6: ["1P 3M 5P 13M", ["6"]],
  "M6#11": ["1P 3M 5P 6M 11A", ["M6b5", "6#11", "6b5"]],
  M69: ["1P 3M 5P 6M 9M", ["69"]],
  "M69#11": ["1P 3M 5P 6M 9M 11A"],
  "M7#11": ["1P 3M 5P 7M 11A", ["maj7#11", "Maj7#11", "M7+4", "M7#4"]],
  "M7#5": ["1P 3M 5A 7M", ["maj7#5", "Maj7#5", "maj9#5", "M7+"]],
  "M7#5sus4": ["1P 4P 5A 7M"],
  "M7#9#11": ["1P 3M 5P 7M 9A 11A"],
  M7add13: ["1P 3M 5P 6M 7M 9M"],
  M7b5: ["1P 3M 5d 7M"],
  M7b6: ["1P 3M 6m 7M"],
  M7b9: ["1P 3M 5P 7M 9m"],
  M7sus4: ["1P 4P 5P 7M"],
  M9: ["1P 3M 5P 7M 9M", ["maj9", "Maj9"]],
  "M9#11": ["1P 3M 5P 7M 9M 11A", ["maj9#11", "Maj9#11", "M9+4", "M9#4"]],
  "M9#5": ["1P 3M 5A 7M 9M", ["Maj9#5"]],
  "M9#5sus4": ["1P 4P 5A 7M 9M"],
  M9b5: ["1P 3M 5d 7M 9M"],
  M9sus4: ["1P 4P 5P 7M 9M"],
  Madd9: ["1P 3M 5P 9M", ["2", "add9", "add2"]],
  Maj7: ["1P 3M 5P 7M", ["maj7", "M7"]],
  Mb5: ["1P 3M 5d"],
  Mb6: ["1P 3M 13m"],
  Msus2: ["1P 2M 5P", ["add9no3", "sus2"]],
  Msus4: ["1P 4P 5P", ["sus", "sus4"]],
  Maddb9: ["1P 3M 5P 9m"],
  "7": ["1P 3M 5P 7m", ["Dominant", "Dom"]],
  "9": ["1P 3M 5P 7m 9M", ["79"]],
  "11": ["1P 5P 7m 9M 11P"],
  "13": ["1P 3M 5P 7m 9M 13M", ["13_"]],
  "11b9": ["1P 5P 7m 9m 11P"],
  "13#11": ["1P 3M 5P 7m 9M 11A 13M", ["13+4", "13#4"]],
  "13#9": ["1P 3M 5P 7m 9A 13M", ["13#9_"]],
  "13#9#11": ["1P 3M 5P 7m 9A 11A 13M"],
  "13b5": ["1P 3M 5d 6M 7m 9M"],
  "13b9": ["1P 3M 5P 7m 9m 13M"],
  "13b9#11": ["1P 3M 5P 7m 9m 11A 13M"],
  "13no5": ["1P 3M 7m 9M 13M"],
  "13sus4": ["1P 4P 5P 7m 9M 13M", ["13sus"]],
  "69#11": ["1P 3M 5P 6M 9M 11A"],
  "7#11": ["1P 3M 5P 7m 11A", ["7+4", "7#4", "7#11_", "7#4_"]],
  "7#11b13": ["1P 3M 5P 7m 11A 13m", ["7b5b13"]],
  "7#5": ["1P 3M 5A 7m", ["+7", "7aug", "aug7"]],
  "7#5#9": ["1P 3M 5A 7m 9A", ["7alt", "7#5#9_", "7#9b13_"]],
  "7#5b9": ["1P 3M 5A 7m 9m"],
  "7#5b9#11": ["1P 3M 5A 7m 9m 11A"],
  "7#5sus4": ["1P 4P 5A 7m"],
  "7#9": ["1P 3M 5P 7m 9A", ["7#9_"]],
  "7#9#11": ["1P 3M 5P 7m 9A 11A", ["7b5#9"]],
  "7#9#11b13": ["1P 3M 5P 7m 9A 11A 13m"],
  "7#9b13": ["1P 3M 5P 7m 9A 13m"],
  "7add6": ["1P 3M 5P 7m 13M", ["67", "7add13"]],
  "7b13": ["1P 3M 7m 13m"],
  "7b5": ["1P 3M 5d 7m"],
  "7b6": ["1P 3M 5P 6m 7m"],
  "7b9": ["1P 3M 5P 7m 9m"],
  "7b9#11": ["1P 3M 5P 7m 9m 11A", ["7b5b9"]],
  "7b9#9": ["1P 3M 5P 7m 9m 9A"],
  "7b9b13": ["1P 3M 5P 7m 9m 13m"],
  "7b9b13#11": ["1P 3M 5P 7m 9m 11A 13m", ["7b9#11b13", "7b5b9b13"]],
  "7no5": ["1P 3M 7m"],
  "7sus4": ["1P 4P 5P 7m", ["7sus"]],
  "7sus4b9": [
    "1P 4P 5P 7m 9m",
    ["susb9", "7susb9", "7b9sus", "7b9sus4", "phryg"]
  ],
  "7sus4b9b13": ["1P 4P 5P 7m 9m 13m", ["7b9b13sus4"]],
  "9#11": ["1P 3M 5P 7m 9M 11A", ["9+4", "9#4", "9#11_", "9#4_"]],
  "9#11b13": ["1P 3M 5P 7m 9M 11A 13m", ["9b5b13"]],
  "9#5": ["1P 3M 5A 7m 9M", ["9+"]],
  "9#5#11": ["1P 3M 5A 7m 9M 11A"],
  "9b13": ["1P 3M 7m 9M 13m"],
  "9b5": ["1P 3M 5d 7m 9M"],
  "9no5": ["1P 3M 7m 9M"],
  "9sus4": ["1P 4P 5P 7m 9M", ["9sus"]],
  m: ["1P 3m 5P"],
  "m#5": ["1P 3m 5A", ["m+", "mb6"]],
  m11: ["1P 3m 5P 7m 9M 11P", ["_11"]],
  "m11A 5": ["1P 3m 6m 7m 9M 11P"],
  m11b5: ["1P 3m 7m 12d 2M 4P", ["h11", "_11b5"]],
  m13: ["1P 3m 5P 7m 9M 11P 13M", ["_13"]],
  m6: ["1P 3m 4P 5P 13M", ["_6"]],
  m69: ["1P 3m 5P 6M 9M", ["_69"]],
  m7: ["1P 3m 5P 7m", ["minor7", "_", "_7"]],
  "m7#5": ["1P 3m 6m 7m"],
  m7add11: ["1P 3m 5P 7m 11P", ["m7add4"]],
  m7b5: ["1P 3m 5d 7m", ["half-diminished", "h7", "_7b5"]],
  m9: ["1P 3m 5P 7m 9M", ["_9"]],
  "m9#5": ["1P 3m 6m 7m 9M"],
  m9b5: ["1P 3m 7m 12d 2M", ["h9", "-9b5"]],
  mMaj7: ["1P 3m 5P 7M", ["mM7", "_M7"]],
  mMaj7b6: ["1P 3m 5P 6m 7M", ["mM7b6"]],
  mM9: ["1P 3m 5P 7M 9M", ["mMaj9", "-M9"]],
  mM9b6: ["1P 3m 5P 6m 7M 9M", ["mMaj9b6"]],
  mb6M7: ["1P 3m 6m 7M"],
  mb6b9: ["1P 3m 6m 9m"],
  o: ["1P 3m 5d", ["mb5", "dim"]],
  o7: ["1P 3m 5d 13M", ["diminished", "m6b5", "dim7"]],
  o7M7: ["1P 3m 5d 6M 7M"],
  oM7: ["1P 3m 5d 7M"],
  sus24: ["1P 2M 4P 5P", ["sus4add9"]],
  "+add#9": ["1P 3M 5A 9A"],
  madd4: ["1P 3m 4P 5P"],
  madd9: ["1P 3m 5P 9M"]
};

// node_modules/tonal-pcset/build/es6.js
var es6_exports5 = {};
__export(es6_exports5, {
  chroma: () => chroma3,
  chromas: () => chromas,
  filter: () => filter,
  includes: () => includes,
  intervals: () => intervals,
  isChroma: () => isChroma,
  isEqual: () => isEqual,
  isSubsetOf: () => isSubsetOf,
  isSupersetOf: () => isSupersetOf,
  modes: () => modes
});
var chr = function(str) {
  return chroma(str) || chroma2(str) || 0;
};
var pcsetNum = function(set) {
  return parseInt(chroma3(set), 2);
};
var clen = function(chroma4) {
  return chroma4.replace(/0/g, "").length;
};
function chroma3(set) {
  if (isChroma(set)) {
    return set;
  }
  if (!Array.isArray(set)) {
    return "";
  }
  var b = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  set.map(chr).forEach(function(i) {
    b[i] = 1;
  });
  return b.join("");
}
var all = null;
function chromas(n) {
  all = all || range(2048, 4095).map(function(n2) {
    return n2.toString(2);
  });
  return typeof n === "number" ? all.filter(function(chroma4) {
    return clen(chroma4) === n;
  }) : all.slice();
}
function modes(set, normalize) {
  normalize = normalize !== false;
  var binary = chroma3(set).split("");
  return compact(
    binary.map(function(_, i) {
      var r = rotate(i, binary);
      return normalize && r[0] === "0" ? null : r.join("");
    })
  );
}
var REGEX3 = /^[01]{12}$/;
function isChroma(set) {
  return REGEX3.test(set);
}
var IVLS = "1P 2m 2M 3m 3M 4P 5d 5P 6m 6M 7m 7M".split(" ");
function intervals(set) {
  if (!isChroma(set)) {
    return [];
  }
  return compact(
    set.split("").map(function(d, i) {
      return d === "1" ? IVLS[i] : null;
    })
  );
}
function isEqual(s1, s2) {
  if (arguments.length === 1) {
    return function(s) {
      return isEqual(s1, s);
    };
  }
  return chroma3(s1) === chroma3(s2);
}
function isSubsetOf(set, notes3) {
  if (arguments.length > 1) {
    return isSubsetOf(set)(notes3);
  }
  set = pcsetNum(set);
  return function(notes4) {
    notes4 = pcsetNum(notes4);
    return notes4 !== set && (notes4 & set) === notes4;
  };
}
function isSupersetOf(set, notes3) {
  if (arguments.length > 1) {
    return isSupersetOf(set)(notes3);
  }
  set = pcsetNum(set);
  return function(notes4) {
    notes4 = pcsetNum(notes4);
    return notes4 !== set && (notes4 | set) === notes4;
  };
}
function includes(set, note2) {
  if (arguments.length > 1) {
    return includes(set)(note2);
  }
  set = chroma3(set);
  return function(note3) {
    return set[chr(note3)] === "1";
  };
}
function filter(set, notes3) {
  if (arguments.length === 1) {
    return function(n) {
      return filter(set, n);
    };
  }
  return notes3.filter(includes(set));
}

// node_modules/tonal-dictionary/build/es6.js
var dictionary = function(raw) {
  var keys = Object.keys(raw).sort();
  var data = [];
  var index = [];
  var add2 = function(name3, ivls, chroma4) {
    data[name3] = ivls;
    index[chroma4] = index[chroma4] || [];
    index[chroma4].push(name3);
  };
  keys.forEach(function(key) {
    var ivls = raw[key][0].split(" ");
    var alias = raw[key][1];
    var chr2 = chroma3(ivls);
    add2(key, ivls, chr2);
    if (alias) {
      alias.forEach(function(a) {
        return add2(a, ivls, chr2);
      });
    }
  });
  var allKeys = Object.keys(data).sort();
  var dict = function(name3) {
    return data[name3];
  };
  dict.names = function(p) {
    if (typeof p === "string") {
      return (index[p] || []).slice();
    } else {
      return (p === true ? allKeys : keys).slice();
    }
  };
  return dict;
};
var combine = function(a, b) {
  var dict = function(name3) {
    return a(name3) || b(name3);
  };
  dict.names = function(p) {
    return a.names(p).concat(b.names(p));
  };
  return dict;
};
var scale = dictionary(scales_default);
var chord = dictionary(chords_default);
var pcset = combine(scale, chord);

// node_modules/tonal-scale/build/es6.js
var es6_exports7 = {};
__export(es6_exports7, {
  chords: () => chords,
  exists: () => exists,
  intervals: () => intervals2,
  modeNames: () => modeNames,
  names: () => names3,
  notes: () => notes,
  props: () => props3,
  subsets: () => subsets,
  supersets: () => supersets,
  toScale: () => toScale,
  tokenize: () => tokenize3
});
var NO_SCALE = Object.freeze({
  name: null,
  intervals: [],
  names: [],
  chroma: null,
  setnum: null
});
var properties3 = function(name3) {
  var intervals4 = scale(name3);
  if (!intervals4) {
    return NO_SCALE;
  }
  var s = { intervals: intervals4, name: name3 };
  s.chroma = chroma3(intervals4);
  s.setnum = parseInt(s.chroma, 2);
  s.names = scale.names(s.chroma);
  return Object.freeze(s);
};
var memoize = function(fn, cache2) {
  return function(str) {
    return cache2[str] || (cache2[str] = fn(str));
  };
};
var props3 = memoize(properties3, {});
var names3 = scale.names;
var intervals2 = function(name3) {
  var p = tokenize3(name3);
  return props3(p[1]).intervals;
};
function notes(nameOrTonic, name3) {
  var p = tokenize3(nameOrTonic);
  name3 = name3 || p[1];
  return intervals2(name3).map(transpose(p[0]));
}
function exists(name3) {
  var p = tokenize3(name3);
  return scale(p[1]) !== void 0;
}
function tokenize3(str) {
  if (typeof str !== "string") {
    return ["", ""];
  }
  var i = str.indexOf(" ");
  var tonic = name(str.substring(0, i)) || name(str) || "";
  var name3 = tonic !== "" ? str.substring(tonic.length + 1) : str;
  return [tonic, name3.length ? name3 : ""];
}
var modeNames = function(name3) {
  var ivls = intervals2(name3);
  var tonics = notes(name3);
  return modes(ivls).map(function(chroma4, i) {
    var name4 = scale.names(chroma4)[0];
    if (name4) {
      return [tonics[i] || ivls[i], name4];
    }
  }).filter(function(x) {
    return x;
  });
};
var chords = function(name3) {
  var inScale = isSubsetOf(intervals2(name3));
  return chord.names().filter(function(name4) {
    return inScale(chord(name4));
  });
};
var toScale = function(notes3) {
  var pcset2 = compact(notes3.map(pc));
  if (!pcset2.length) {
    return pcset2;
  }
  var tonic = pcset2[0];
  var scale3 = unique(pcset2);
  return rotate(scale3.indexOf(tonic), scale3);
};
var supersets = function(name3) {
  if (!intervals2(name3).length) {
    return [];
  }
  var isSuperset = isSupersetOf(intervals2(name3));
  return scale.names().filter(function(name4) {
    return isSuperset(scale(name4));
  });
};
var subsets = function(name3) {
  var isSubset = isSubsetOf(intervals2(name3));
  return scale.names().filter(function(name4) {
    return isSubset(scale(name4));
  });
};

// node_modules/tonal-chord/build/es6.js
var es6_exports8 = {};
__export(es6_exports8, {
  exists: () => exists2,
  intervals: () => intervals3,
  names: () => names4,
  notes: () => notes2,
  props: () => props4,
  subsets: () => subsets2,
  supersets: () => supersets2,
  tokenize: () => tokenize4
});
var names4 = chord.names;
var NO_CHORD = Object.freeze({
  name: null,
  names: [],
  intervals: [],
  chroma: null,
  setnum: null
});
var properties4 = function(name3) {
  var intervals4 = chord(name3);
  if (!intervals4) {
    return NO_CHORD;
  }
  var s = { intervals: intervals4, name: name3 };
  s.chroma = chroma3(intervals4);
  s.setnum = parseInt(s.chroma, 2);
  s.names = chord.names(s.chroma);
  return s;
};
var memo3 = function(fn, cache2) {
  if (cache2 === void 0) cache2 = {};
  return function(str) {
    return cache2[str] || (cache2[str] = fn(str));
  };
};
var props4 = memo3(properties4);
var intervals3 = function(name3) {
  return props4(tokenize4(name3)[1]).intervals;
};
function notes2(nameOrTonic, name3) {
  if (name3) {
    return props4(name3).intervals.map(transpose(nameOrTonic));
  }
  var ref = tokenize4(nameOrTonic);
  var tonic = ref[0];
  var type = ref[1];
  return props4(type).intervals.map(transpose(tonic));
}
var exists2 = function(name3) {
  return chord(tokenize4(name3)[1]) !== void 0;
};
var supersets2 = function(name3) {
  if (!intervals3(name3).length) {
    return [];
  }
  var isSuperset = isSupersetOf(intervals3(name3));
  return chord.names().filter(function(name4) {
    return isSuperset(chord(name4));
  });
};
var subsets2 = function(name3) {
  var isSubset = isSubsetOf(intervals3(name3));
  return chord.names().filter(function(name4) {
    return isSubset(chord(name4));
  });
};
var NUM_TYPES = /^(6|64|7|9|11|13)$/;
function tokenize4(name3) {
  var p = tokenize(name3);
  if (p[0] === "") {
    return ["", name3];
  }
  if (p[0] === "A" && p[3] === "ug") {
    return ["", "aug"];
  }
  if (NUM_TYPES.test(p[2])) {
    return [p[0] + p[1], p[2] + p[3]];
  } else {
    return [p[0] + p[1] + p[2], p[3]];
  }
}

// node_modules/tonal/index.js
var transpose2 = transpose;
var interval2 = interval;
var note = props;
var midi2 = midi;
var freq2 = freq;
var chord2 = chord;
var scale2 = scale;

export {
  es6_exports,
  es6_exports2,
  es6_exports3,
  es6_exports4,
  es6_exports5,
  es6_exports6,
  es6_exports7,
  es6_exports8,
  transpose2 as transpose,
  interval2 as interval,
  note,
  midi2 as midi,
  freq2 as freq,
  chord2 as chord,
  scale2 as scale
};
//# sourceMappingURL=chunk-72EC6E55.js.map
