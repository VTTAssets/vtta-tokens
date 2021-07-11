const combineObjects = (obj1, obj2) => {
  return Object.assign(
    JSON.parse(JSON.stringify(obj1)),
    JSON.parse(JSON.stringify(obj2))
  );
};

export default combineObjects;
