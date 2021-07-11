const slugify = (s) => {
  return s
    .replace(/[àáâãäå]/g, "a")
    .replace(/æ/g, "ae")
    .replace(/ç/g, "c")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/ñ/g, "n")
    .replace(/[òóôõö]/g, "o")
    .replace(/œ/g, "oe")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ýÿ]/g, "y")
    .replace(/[’']/g, "")
    .replace(/\W+/g, "-")
    .replace(/\-\-+/g, "-")
    .replace(/^\-/, "")
    .replace(/\-$/, "")
    .toLowerCase();
};

const capitalize = (str, seperator = " ") => {
  return str
    .split(seperator)
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .map((part) => part.substr(0, 1).toUpperCase() + part.substring(1))
    .join(" ");
};

const ucFirst = (str) => {
  return str.substr(0, 1).toUpperCase() + str.substring(1);
};

export { slugify, capitalize, ucFirst };
