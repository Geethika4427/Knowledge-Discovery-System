# Smart Internal Search Tool – Knowledge Discovery System

A powerful internal search engine designed for marketing teams to quickly find documents, assets, and information using fast indexing, intelligent categorization, and full-text search.

## Features
1)Smart Search <br>

- Full-text search across all uploaded documents<br>

- Keyword and content-based matching<br>

- Instant, relevant results with preview snippets<br>

- Supports TXT, PDF, CSV, DOCX, images, and more<br>

2)Document Upload & Processing

- Upload multiple document formats<br>

--Backend automatically extracts text<br>

- Metadata like file name, date, and size stored<br>

- Secure file storage using Multer<br>

3)Auto Categorization<br>

- Backend automatically categorizes documents using extracted content.<br>

Example categories:<br>

Campaigns<br>

Branding<br>

Market Research<br>

Social Media<br>

Assets<br>

Internal Docs<br>

Custom categories based on content<br>

4)Categories Dashboard<br>

- Dynamic categories list<br>

- Displays count of files in each category<br>

- Filter documents by category<br>

## Tech Stack
Frontend -  Reactjs<br>

Backend - Node.js, Express.js, MongoDB Atlas, File parsers for PDF/TXT/CSV, Category generator logic

## How It Works

1. Upload a file

2. Backend extracts text

3. Category is generated based on content

4. File + metadata saved to MongoDB

5. Search engine indexes everything

6. Frontend fetches categories dynamically

7. Users can search, filter, view, and download files
