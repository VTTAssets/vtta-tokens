import config from "../../config/index.js";
import logger from "../../util/logger.js";

const addImages = ($form, images, newImages) => {
  // display the previews on the designated area
  $form.find(".box__preview").append(newImages.map((i) => i.img));

  // return the updated array for the result of the modal
  return images.concat(newImages);
};

/**
 *
 * @param {Image[]} images Existing images on the upload stage
 * @param {Image[]} toFilter Newly added images that needs filtering for duplicates
 * @returns {Image[]} Cleaned up array of images
 */
const filterDuplicates = (images, toFilter) => {
  // du not upload duplicates
  return [...toFilter].filter(
    (image) =>
      images.find((i) => i.name === image.name && i.size === image.size) ===
      undefined
  );
};

/**
 *
 * @param {*} existingImages
 * @param {*} newImages
 */
const loadImages = (newImages) => {
  return new Promise((resolve, reject) => {
    // Load the image content via a FileReader
    Promise.allSettled(
      newImages.map((image) => {
        return new Promise((resolve, reject) => {
          let fileReader = new FileReader();
          image.img = new Image();

          fileReader.onload = () => {
            image.img.src = fileReader.result;
            image.img.title = fileReader.name;
            image.img.onload = (result) => {
              $(image.img).addClass("transparency-pattern-sm");
              resolve(image);
            };
            image.img.onerror = (error) => {
              console.log("Image loading failed");
              console.log(error);
            };
          };
          fileReader.readAsDataURL(image);
        });
      })
    ).then((results) => {
      // map the resolved ones to their values
      const successfullyLoadedImages = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);

      // return the result
      resolve(successfullyLoadedImages);
    });
  });
};

// check if drag/drop upload is supported
const supportsDragDropUpload = () => {
  const div = document.createElement("div");
  return (
    ("draggable" in div || ("ondragstart" in div && "ondrop" in div)) &&
    "FormData" in window &&
    "FileReader" in window
  );
};

/**
 * Handle local file usage for the editor
 * Shows a modal dialog that allows drag/drop or regular file selector menu uploads
 * @param editor: TokenEditor ui instance
 */
const handleLocalFiles = ($form) => {
  return new Promise(async (resolve, reject) => {
    // the final images selected to be used
    let images = [];

    // creating the modal
    logger.info("Rendering partial", config.templates.partials.ADD_LAYER_LOCAL);
    const html = await renderTemplate(
      config.templates.partials.ADD_LAYER_LOCAL,
      {}
    );

    const modal = new window.vtta.ui.Modal(
      "handle-file-local",
      "Upload local file",
      html,
      [window.vtta.ui.BUTTON_OK, window.vtta.ui.BUTTON_CANCEL]
    );

    // show the modal and await the response
    modal.show().then((response) => {
      if (response.button !== "OK") return;

      console.log("Response: ");
      console.log(response);
      console.log(images);

      resolve(images);
    });

    // interact with the modal while shown
    const $form = $("#handle-file-local").find("form.box");

    // enable drag and drop and listen to those events
    if (supportsDragDropUpload()) {
      $form.addClass("supportsDragDropUpload");
      $form
        .on(
          "drag dragstart dragend dragover dragenter dragleave drop",
          function (e) {
            e.preventDefault();
            e.stopPropagation();
          }
        )
        .on("dragover dragenter", function () {
          $form.addClass("is-dragover");
        })
        .on("dragleave dragend drop", function () {
          $form.removeClass("is-dragover");
        })
        .on("drop", function (e) {
          const filteredImages = filterDuplicates(
            images,
            e.originalEvent.dataTransfer.files
          );
          loadImages(filteredImages).then((loadedImages) => {
            images = addImages($form, images, loadedImages);
          });
        });
    }

    // enable regular file uploads
    $form.find('input[type="file"]').on("change", (e) => {
      const filteredImages = filterDuplicates(images, e.target.files);
      loadImages(filteredImages).then((loadedImages) => {
        images = addImages($form, images, loadedImages);
      });
    });
  });
};

export default handleLocalFiles;
