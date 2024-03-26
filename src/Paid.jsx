import React, { useState, useRef } from "react";
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

const ColorAnalysis = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState("");
  const [apiError, setApiError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const resultRef = useRef(null);

  const handleImageUpload = async (event) => {
    document.getElementById("image-upload").classList.remove("hovered");
    const files = event.target.files;
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/heic",
      "image/heif",
    ];
    const maxSizeInBytes = 15 * 1024 * 1024; // 5 MB
    const selectedImages = [];

    setIsLoading(true);

    // Check if the number of selected files exceeds 5
    if (files.length > 5) {
      alert("Please select up to 5 images.");
      event.target.value = null; // Reset the input to clear the selected files
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (
        file &&
        allowedTypes.includes(file.type) &&
        file.size <= maxSizeInBytes
      ) {
        try {
          let convertedFile = file;
          if (file.type === "image/heic" || file.type === "image/heif") {
            // Convert HEIC to JPEG
            convertedFile = await heic2any({
              blob: file,
              toType: "image/jpeg",
              quality: 0.8,
            });
          }
          selectedImages.push(convertedFile);
          if (selectedImages.length === files.length) {
            try {
              await uploadImages(selectedImages);
            } catch (error) {
              console.error("Error uploading images:", error);
              alert("Error uploading images. Please try again.");
            }
          }
        } catch (error) {
          console.error("Error converting image:", error);
          alert("Error converting image. Please try again.");
        }
      } else {
        alert(
          `File ${file.name} is not a valid image file (JPEG, PNG, GIF, WebP, or HEIC) or exceeds the size limit of 5 MB.`,
        );
      }
    }
  };

  const uploadImages = async (images) => {
    try {
      const uniqueId = uuidv4();
      const imageTypes = images.map((image) => image.type);
      const response = await axios.post(
        "https://oobi2u3h7i.execute-api.ap-northeast-1.amazonaws.com/production/upload",
        { count: images.length, uniqueId: uniqueId, imageTypes: imageTypes },
      );
      console.log(response.data);
      const presignedUrls = response.data.body;
      const uploadPromises = images.map(async (image, index) => {
        const url = presignedUrls[index];
        await fetch(url, {
          method: "PUT",
          body: image,
          headers: {
            "Content-Type": image.type,
          },
        });
        return url;
      });
      const uploadedUrls = await Promise.all(uploadPromises);
      console.log("Uploaded image URLs:", uploadedUrls);
      // Redirect to Stripe payment page
      const stripeUrl = `https://buy.stripe.com/cN2bKMeoogur8tq149?client_reference_id=${uniqueId}`;
      window.location.href = stripeUrl;
    } catch (error) {
      throw new Error("Failed to upload images: " + error.message);
    }
    setIsLoading(false);
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
              Upload your image and let our AI take you back to the 2000s.
            </Typography>
          </Box>
          <Box my={4} textAlign="center">
            <input
              type="file"
              accept="image/jpeg, image/png, image/gif, image/webp"
              onChange={handleImageUpload}
              style={{ display: "none" }}
              id="image-upload"
              multiple
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
                  "Upload Images (max 5)"
                )}
              </UploadButton>
            </label>
          </Box>
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
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default ColorAnalysis;
