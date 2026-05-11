# Visitor Management UI

This project is a Visitor Management application built with React. It allows users to manage visitor information, including adding new visitors, viewing a list of visitors, and filtering them based on their location.

## Project Structure

```
visitor-management-ui
├── public
│   └── index.html          # Main HTML file
├── src
│   ├── App.js              # Main application component
│   ├── index.js            # Entry point for the React application
│   ├── components
│   │   ├── VisitorList.js  # Component to display the list of visitors
│   │   ├── VisitorForm.js  # Component to add new visitors
│   │   └── FilterBar.js    # Component for filtering visitors by location
│   ├── styles
│   │   └── App.css         # CSS styles for the application
│   └── utils
│       └── api.js          # Utility functions for API calls
├── package.json             # npm configuration file
├── .gitignore               # Files and directories to ignore by Git
└── README.md                # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (Node Package Manager)

### Installation

1. Clone the repository:

   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:

   ```
   cd visitor-management-ui
   ```

3. Install the dependencies:

   ```
   npm install
   ```

### Running the Application

To start the application, run the following command:

```
npm start
```

This will start the development server and open the application in your default web browser at `http://localhost:3000`.

### Features

- View a list of visitors with details such as name, company, and location.
- Filter visitors by location (All, Office, Warehouse, Gate).
- Add new visitors using a form.
- Delete visitors from the list.

### Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

### License

This project is licensed under the MIT License. See the LICENSE file for details.