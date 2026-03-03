#!/bin/bash

# Directories
INPUT_DIR="eps"
OUTPUT_DIR="jpeg"

# JPEG Settings
RESOLUTION=150   # Render at 150 DPI for balance of quality and size
JPEG_QUALITY=85  # Quality of the JPEG image (85 is very good, much smaller than 95)

echo "Checking required tools..."

# Check for Ghostscript (gs) which is reliable for rendering EPS without ImageMagick policy issues
if ! command -v gs >/dev/null 2>&1; then
    echo "Error: Ghostscript is not installed."
    echo "Please install it by running: sudo apt install ghostscript"
    exit 1
fi

# Check for ExifTool which is best for reading/writing metadata like Title/Tags
if ! command -v exiftool >/dev/null 2>&1; then
    echo "Error: ExifTool is not installed."
    echo "Please install it by running: sudo apt install libimage-exiftool-perl"
    exit 1
fi

# Create output dir if it doesn't exist just in case
mkdir -p "$OUTPUT_DIR"

# Check if there are any EPS files to process
shopt -s nullglob
eps_files=("$INPUT_DIR"/*.eps)

if [ ${#eps_files[@]} -eq 0 ]; then
    echo "No .eps files found in $INPUT_DIR/"
    exit 0
fi

echo "Found ${#eps_files[@]} EPS files. Starting conversion..."

# Process each EPS file
for eps_file in "${eps_files[@]}"; do
    # Extract filename without path and extension
    filename=$(basename -- "$eps_file")
    filename_noext="${filename%.*}"
    jpeg_file="$OUTPUT_DIR/${filename_noext}.jpg"
    
    echo "--------------------------------------------------------"
    echo "Processing: $filename"
    
    # 1. Convert the EPS file to a JPEG using Ghostscript
    # using -dEPSCrop to tightly crop the image if it has a bounding box
    gs -dSAFER -dBATCH -dNOPAUSE -dEPSCrop -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r"$RESOLUTION" -sDEVICE=jpeg -dJPEGQ="$JPEG_QUALITY" -sOutputFile="$jpeg_file" "$eps_file" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✔ Successfully created $jpeg_file"
        
        # 2. Extract and embed metadata from the EPS to the JPEG using ExifTool
        echo "Copying metadata (Title, Tags, etc.)..."
        exiftool -TagsFromFile "$eps_file" -all:all -overwrite_original "$jpeg_file" >/dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo "✔ Metadata copied to $jpeg_file successfully"
        else
            echo "✘ Failed to copy metadata for $filename"
        fi
    else
        echo "✘ Failed to convert $filename to JPEG"
    fi
done

echo "--------------------------------------------------------"
echo "All done! Check the '$OUTPUT_DIR' folder for your JPEGs."
