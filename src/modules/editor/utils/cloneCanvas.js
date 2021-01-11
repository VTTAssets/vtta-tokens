const cloneCanvas = (source) => {
  const target = document.createElement("canvas");
  target.width = source.width;
  target.height = source.height;
  target.getContext("2d").drawImage(source, 0, 0);
  return target;
};

export default cloneCanvas;
