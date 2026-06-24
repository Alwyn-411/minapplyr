
# MinAppyr

**Minimal Job Application Form Filler (Firefox Extension)**

MinAppyr is a lightweight browser extension that automatically saves form inputs when you submit applications and lets you quickly autofill them later using a simple right-click context menu.

It is designed for job applications, internship forms, and repetitive online forms.


## Features

* Automatically saves form submissions per website
* One-click autofill using right-click context menu
* Minimal UI (no intrusive floating buttons)
* Settings inside Firefox “Add-ons → Preferences”


## How it works

1. Fill any form normally
2. Submit the form
3. MinAppyr stores the data locally (per domain)
4. Later, right-click on any page
5. Select Autofill application 
6. Your last saved data is automatically filled in



## Usage

### Enable / Disable extension

* Go to:

  ```
  about:addons → MinAppyr → Preferences
  ```
* Toggle extension on/off

### Export / Clear data

Available in Preferences panel:

* Export saved form data as JSON
* Clear all stored data


## Tech Stack

* JavaScript (Vanilla)
* WebExtension APIs
* Firefox Manifest V3
* Context Menus API
* Storage API

## Project Structure

```text
MinAppyr/
│
├── background/
│   └── background.js
│
├── content/
│   └── content.js
│
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
│
├── options/
│   ├── options.html
│   ├── options.css
│   └── options.js
│
├── icons/
│   ├── icon.svg
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
│
└── manifest.json
```

## Installation (Development Mode)

1. Open Firefox
2. Go to:

   ```
   about:debugging
   ```
3. Click:
   **“This Firefox”**
4. Click:
   **“Load Temporary Add-on”**
5. Select `manifest.json`

## Notes

* Built specifically for Firefox (Manifest V3)
* Uses native browser APIs only
* Designed to stay minimal and fast
* No external dependencies

## Why ?

To demystify Brower Extensions and native browser apis 

## License

MIT License — feel free to modify and use.
