const addWatermark = async (imageUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the image
      ctx.drawImage(img, 0, 0);

      // Add watermark
      ctx.font = "50px Arial";
      ctx.fillStyle = "rgba(255, 255, 255, 1)";
      const text = "www.ps2filter.fun";
      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, canvas.width - textWidth - 10, canvas.height - 10);

      const watermarkedImageUrl = canvas.toDataURL("image/jpeg");
      resolve(watermarkedImageUrl);
    };
    img.onerror = (error) => {
      reject(error);
    };
    img.src = imageUrl;
  });
};
