import React, { useState, useRef, useEffect } from "react";
import {
  Button,
  Container,
  Grid,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/system";
import axios from "axios";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { v4 as uuidv4 } from "uuid";
import one from "../assets/1.webp";
import two from "../assets/2.webp";
import three from "../assets/3.webp";
import four from "../assets/4.webp";
import five from "../assets/5.webp";
import mixpanel from "mixpanel-browser";

mixpanel.init("947e491d9c2d4805b596f7bf350c3370", {
  debug: true,
  track_pageview: true,
  persistence: "localStorage",
});

const theme = createTheme({
  typography: {
    h2: {
      fontFamily: "DotGothic16, serif",
    },
  },
});

const UploadButton = styled(Button)({
  background: "white",
  borderRadius: 28,
  border: 0,
  color: "black",
  height: 48,
  padding: "0 30px",
  transition: "0.3s",
  "&:hover": {
    background: "white",
    boxShadow: "0 3px 5px 2px rgba(255, 255, 255, 0.5)",
  },
});

const WatermarkButton = styled(Button)({
  background: "white",
  borderRadius: 28,
  border: 0,
  color: "black",
  height: 48,
  padding: "0 30px",
  transition: "0.3s",
  "&:hover": {
    background: "white",
    boxShadow: "0 3px 5px 2px rgba(255, 255, 255, 0.5)",
  },
});

const ColorAnalysis = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWatermarkLoading, setIsWatermarkLoading] = useState(false);
  const resultRef = useRef(null);
  const [imageKey, setImageKey] = useState(null);
  const [showWatermarkButton, setShowWatermarkButton] = useState(true);
  const [isWatermarkedImage, setIsWatermarkedImage] = useState(true);

  const getQueryParameter = (name, url) => {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
    const results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return "";
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  };

  const fetchSessionInfo = async (sessionId) => {
    try {
      const response = await axios.post(
        "https://oobi2u3h7i.execute-api.ap-northeast-1.amazonaws.com/production/session", // Replace with your Lambda endpoint
        { sessionId },
      );

      console.log(response);

      if (response.data.statusCode === 200) {
        setSelectedImage(response.data.body);
        setIsWatermarkedImage(false);
        mixpanel.track("Succesful Watermark Removal");
      } else {
        console.log("Failed to fetch session information");
      }
    } catch (error) {
      console.log("An error occurred while fetching session information");
    }
  };

  useEffect(() => {
    const sessionId = getQueryParameter("session_id");
    if (sessionId) {
      console.log("Session ID:", sessionId);
      fetchSessionInfo(sessionId);
      // Now you can use the session ID to fetch data or perform other actions
    }
  }, []);

  const handleImageUpload = async (event) => {
    mixpanel.track("Generate Clicked");
    const file = event.target.files[0];
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/heic",
    ];
    const maxSizeInBytes = 5 * 1024 * 1024; // 5 MB

    if (
      file &&
      allowedTypes.includes(file.type) &&
      file.size <= maxSizeInBytes
    ) {
      try {
        let convertedFile;
        if (file.type === "image/heic" || file.type === "image/heif") {
          // Convert HEIC to JPEG
          convertedFile = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.8,
          });
        } else if (file.type === "image/webp") {
          // Convert WebP to JPEG
          convertedFile = await convertWebpToJpeg(file);
        }

        const reader = new FileReader();
        reader.onload = () => {
          const mimeType = convertedFile ? convertedFile.type : file.type;
          sendImageToAPI(reader.result, mimeType);
        };
        reader.readAsDataURL(convertedFile || file);
      } catch (error) {
        console.error("Error converting image:", error);
        alert(
          "Error converting image. Please try again with a different image.",
        );
      }
    } else {
      alert(
        "Please upload a valid image file (JPEG, PNG, GIF, WebP, or HEIC) under 5 MB.",
      );
    }
  };

  // Function to convert WebP to JPEG using Canvas API
  const convertWebpToJpeg = (webpFile) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, img.width, img.height);
        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], "image.jpg", { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.8,
        );
      };
      img.onerror = (error) => {
        reject(error);
      };
      img.src = URL.createObjectURL(webpFile);
    });
  };

  const sendImageToAPI = async (base64Image, mimeType) => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        "https://oobi2u3h7i.execute-api.ap-northeast-1.amazonaws.com/production/free",
        {
          image: base64Image.split(",")[1],
          media_type: mimeType,
        },
      );
      const imageUrl = response.data.body;
      console.log("Received image URL from API:", imageUrl);

      const key = imageUrl[0].match(/pbxt\/([^/]+)/)[1];
      setImageKey(key);

      setImageKey(key);

      if (response.data.body.statusCode == 500) {
        setApiError("No face detected");
        setIsLoading(false);
        return;
      }

      if (imageUrl) {
        mixpanel.track("Picture Generated", { imageUrl: imageUrl });
      }

      // Add watermark to the image
      const watermarkedImageUrl = await addWatermark(imageUrl);

      setSelectedImage(watermarkedImageUrl);
      setApiError(null);
      scrollToResult();
      setIsWatermarkedImage(true);
    } catch (error) {
      console.error("Error:", error);
    }
    setIsLoading(false);
  };

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

        // Define watermark text and style
        const watermarkText = "www.ps2filter.fun";
        const watermarkFontSize = 50;
        ctx.font = `${watermarkFontSize}px Arial`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; // Adjust transparency as needed

        // Calculate the number of repetitions and spacing between each watermark
        const repeatX = Math.ceil(
          canvas.width /
            (ctx.measureText(watermarkText).width + watermarkFontSize * 2),
        );
        const repeatY = Math.ceil(canvas.height / (watermarkFontSize * 2));
        const offsetX =
          (canvas.width - repeatX * ctx.measureText(watermarkText).width) /
          (repeatX + 1);
        const offsetY =
          (canvas.height - repeatY * watermarkFontSize) / (repeatY + 1);

        // Add watermarks
        for (let y = 0; y < repeatY; y++) {
          for (let x = 0; x < repeatX; x++) {
            ctx.fillText(
              watermarkText,
              offsetX + x * ctx.measureText(watermarkText).width + x * offsetX,
              offsetY + y * watermarkFontSize + y * offsetY,
            );
          }
        }

        const watermarkedImageUrl = canvas.toDataURL("image/jpeg");
        resolve(watermarkedImageUrl);
      };
      img.onerror = (error) => {
        reject(error);
      };
      img.src = imageUrl;
    });
  };

  const handleWatermark = async (event) => {
    mixpanel.track("Watermark Button Clicked");
    setIsWatermarkLoading(true);
    console.log(imageKey);
    const stripeUrl = `https://buy.stripe.com/cN2bKMeoogur8tq149?client_reference_id=${imageKey}`;
    window.location.href = stripeUrl;
    setIsWatermarkLoading(false);
  };

  const scrollToResult = () => {
    if (resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          backgroundColor: "#0055ff",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Box my={4}>
            <Typography
              variant="h2"
              fontWeight={600}
              align="center"
              gutterBottom
              color="white"
              style={{ lineHeight: "1.0" }}
            >
              Try The AI PS2 Style Filter
            </Typography>
            <Typography variant="subtitle1" align="center" color="white">
              Upload your image and let our AI take you back to the 2000s. (Only
              images with faces in it will work)
            </Typography>
          </Box>
          <Box my={4} textAlign="center">
            <input
              type="file"
              accept="image/jpeg, image/png, image/gif, image/webp"
              onChange={handleImageUpload}
              style={{ display: "none" }}
              id="image-upload"
            />
            <label htmlFor="image-upload">
              <UploadButton
                variant="contained"
                component="span"
                disabled={isLoading}
              >
                {isLoading ? (
                  <CircularProgress size={24} style={{ color: "white" }} />
                ) : (
                  "Upload Image"
                )}
              </UploadButton>
            </label>
          </Box>
          {selectedImage && (
            <Grid
              container
              spacing={4}
              justifyContent="center"
              alignItems="center"
            >
              <Grid item xs={12} md={6}>
                <Box
                  mt={4}
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                >
                  <img
                    src={selectedImage}
                    alt="Selected"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: 8,
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </Box>
                <Box my={4} textAlign="center">
                  {selectedImage &&
                    showWatermarkButton &&
                    isWatermarkedImage && (
                      <label htmlFor="watermark-button">
                        <WatermarkButton
                          variant="contained"
                          component="span"
                          disabled={isWatermarkLoading}
                          onClick={handleWatermark} // Pass imageKey here
                        >
                          {isWatermarkLoading ? (
                            <CircularProgress
                              size={24}
                              style={{ color: "white" }}
                            />
                          ) : (
                            "Remove Watermark - $1"
                          )}
                        </WatermarkButton>
                      </label>
                    )}
                </Box>
              </Grid>
            </Grid>
          )}
          {apiError && (
            <Typography variant="body1" align="center" color="white">
              {apiError}
            </Typography>
          )}
          {!selectedImage && (
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Box
                  mt={4}
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                >
                  <img
                    src={one}
                    alt="Selected"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: 8,
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box
                  mt={4}
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                >
                  <img
                    src={two}
                    alt="Selected"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: 8,
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box
                  mt={4}
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                >
                  <img
                    src={three}
                    alt="Selected"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: 8,
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box
                  mt={4}
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                >
                  <img
                    src={four}
                    alt="Selected"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: 8,
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          )}
          <Typography
            variant="subtitle1"
            align="center"
            color="white"
            paddingTop="25px"
          >
            <a
              href="mailto:ps2filter.fun@gmail.com"
              style={{ color: "inherit", textDecoration: "underline" }}
            >
              Contact Us
            </a>
          </Typography>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default ColorAnalysis;
