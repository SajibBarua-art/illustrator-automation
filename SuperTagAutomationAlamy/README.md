# Alamy SuperTag Automator

This Chrome Extension automatically clicks the star icon on your image tags until there are 10 supertags selected. 
It functions continuously in the background while you have the Alamy Image Manager open. 

## How it works:
1. When you select an image, the tags load in the right sidebar. 
2. The automation script detects the `0/10 supertags` text.
3. It then automatically identifies the star icons next to the tags and clicks them until `10/10 supertags` are active.
4. It includes randomized human-like delays (~1 second per click) between checking and clicking to ensure stability and avoid triggering automated abuse systems on Alamy.

## How to Install Chrome Extension
1. Open Google Chrome.
2. Go to the URL bar and enter: `chrome://extensions/`
3. In the top right corner, turn ON the toggle for **Developer mode**.
4. Click the **Load unpacked** button that appears in the top left corner.
5. In the file explorer, navigate to and select this directory: `/home/sajibbarua/illustrator/projects/SuperTagAutomationAlamy`
6. Click **Select**. 
7. The extension will now be loaded! It will automatically start working when you visit the Alamy image upload page and select an image!

## Setup and Adjustments
- If you notice that the clicking is too fast or slow, you can edit `content.js`, locate the `delay(...)` numbers, and adjust them.
- To disable the script, click the slider icon next to "Alamy SuperTag Automator" inside your `chrome://extensions` page.
