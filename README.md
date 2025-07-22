# BookHub - Discover & Share Knowledge

BookHub is a web application that allows users to discover, read, and share books and audiobooks. It provides a community-driven platform for knowledge sharing with user authentication, favorites management, and content categorization.

![BookHub Screenshot](assets/bookhub.png)

## Features

- **User Authentication**: Secure login and signup functionality
- **Book Library**: Browse, search, and filter books by categories
- **Audiobook Collection**: Access to a variety of audiobooks
- **Favorites System**: Save your favorite books and audiobooks
- **User Profiles**: Personalized user experience
- **Admin Dashboard**: Content management for administrators
- **Responsive Design**: Mobile-friendly interface for reading on the go

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **CSS Framework**: Bootstrap 5
- **Icons**: Font Awesome
- **Backend**: Supabase (Authentication, Database, Storage)
- **Notifications**: SweetAlert2

## Project Structure

```
├── assets/             # SVG illustrations and images
│   ├── avatar.svg      # User avatar illustration
│   ├── books.svg       # Books illustration for homepage
│   ├── contact.svg     # Contact section illustration
│   ├── login.svg       # Login page illustration
│   └── signup.svg      # Signup page illustration
├── components/         # Reusable HTML components
│   ├── footer.html     # Site footer component
│   └── navbar.html     # Navigation bar component
├── css/                # Stylesheets for different pages
│   ├── audiobooks.css  # Styles for audiobooks page
│   ├── auth.css        # Styles for login/signup pages
│   ├── books.css       # Styles for books page
│   ├── components.css  # Styles for reusable components
│   ├── dashboard.css   # Styles for admin dashboard
│   ├── home.css        # Styles for homepage
│   ├── myaudiobooks.css # Styles for user's audiobooks
│   ├── mybooks.css     # Styles for user's books
│   ├── myfavorites.css # Styles for user's favorites
│   └── profile.css     # Styles for user profile
├── js/                 # JavaScript functionality
│   ├── adminAuthCheck.js # Admin authentication verification
│   ├── audiobooks.js   # Audiobooks page functionality
│   ├── authCheck.js    # User authentication verification
│   ├── books.js        # Books page functionality
│   ├── dashboard.js    # Admin dashboard functionality
│   ├── home.js         # Homepage functionality
│   ├── include.js      # Component inclusion logic
│   ├── login.js        # Login functionality
│   ├── myaudiobooks.js # User's audiobooks functionality
│   ├── mybooks.js      # User's books functionality
│   ├── myfavorites.js  # User's favorites functionality
│   ├── profile.js      # User profile functionality
│   ├── signup.js       # Signup functionality
│   └── supabaseClient.js # Supabase connection
└── pages/              # HTML pages for the application
    ├── audiobooks.html # Audiobooks browsing page
    ├── books.html      # Books browsing page
    ├── dashboard.html  # Admin dashboard
    ├── home.html       # Homepage/landing page
    ├── login.html      # User login page
    ├── myaudiobooks.html # User's audiobooks page
    ├── Mybooks.html    # User's books page
    ├── myfavorites.html # User's favorites page
    ├── profile.html    # User profile page
    └── signup.html     # User registration page
```

## Getting Started

### Prerequisites

- Web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Supabase account (for backend services)

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/M7Xb/BookHub.git
   ```

2. Open the project in your code editor

3. Configure Supabase:

   - Create a Supabase project
   - Update the Supabase URL and key in `js/supabaseClient.js`
   - Set up the required database tables:

     **Tables:**

     - `profiles`: User profile information

       - `id` (UUID, PK, references auth.users.id)
       - `full_name` (text)
       - `avatar_url` (text)
       - `role` (text, 'user' or 'admin')
       - `created_at` (timestamp with timezone)

     - `books`: Book information

       - `id` (UUID, PK)
       - `title` (text)
       - `author` (text)
       - `description` (text)
       - `cover_url` (text, path to cover image in storage)
       - `book_url` (text, path to book file in storage)
       - `category_id` (UUID, FK references categories.id)
       - `user_id` (UUID, FK references profiles.id)
       - `created_at` (timestamp with timezone)

     - `audiobooks`: Audiobook information

       - `id` (UUID, PK)
       - `title` (text)
       - `author` (text)
       - `narrator` (text)
       - `description` (text)
       - `cover_url` (text, path to cover image in storage)
       - `audiobook_url` (text, path to main audiobook file in storage)
       - `category_id` (UUID, FK references categories.id)
       - `user_id` (UUID, FK references profiles.id)
       - `created_at` (timestamp with timezone)

     - `audiobook_parts`: Parts of audiobooks for multi-part audiobooks

       - `id` (UUID, PK)
       - `audiobook_id` (UUID, FK references audiobooks.id)
       - `part_number` (integer)
       - `title` (text)
       - `audio_url` (text, path to audio file in storage)
       - `duration` (integer, in seconds)
       - `created_at` (timestamp with timezone)

     - `favorites`: User favorite books and audiobooks

       - `id` (UUID, PK)
       - `user_id` (UUID, FK references profiles.id)
       - `book_id` (UUID, FK references books.id, nullable)
       - `audiobook_id` (UUID, FK references audiobooks.id, nullable)
       - `created_at` (timestamp with timezone)

     - `categories`: Content categories
       - `id` (UUID, PK)
       - `name` (text)
       - `description` (text)
       - `created_at` (timestamp with timezone)

   - Create the required storage buckets:

     **Storage Buckets:**

     - `avatars`: For user profile pictures
     - `book-covers`: For book cover images
     - `book-files`: For book files (PDF, EPUB, etc.)
     - `audiobook-covers`: For audiobook cover images
     - `audio-books`: For main audiobook files
     - `audio-book-parts`: For individual parts of audiobooks

   - Set up appropriate storage and database access policies
   - Enable email authentication in the Authentication settings

4. Launch the application:
   - Open `pages/home.html` in your browser or use a local server

## Database Schema

### Tables

- **profiles**: User profiles with roles (user/admin)
- **books**: Book information including title, author, description, cover URL
- **audiobooks**: Audiobook information including title, narrator, audio URL
- **favorites**: User favorite books and audiobooks
- **categories**: Content categories for organization

## Pages Description

### User-Facing Pages

1. **Home (home.html)**

   - Landing page with hero section, statistics, featured content
   - Latest book uploads and call-to-action sections
   - Contact form for user inquiries
   - Accessible to both logged-in and non-logged-in users

2. **Books (books.html)**

   - Browse all available books with filtering by categories
   - Book cards with cover images, titles, authors, and descriptions
   - Modal view for detailed book information
   - Download functionality for book files
   - Add to favorites option for logged-in users

3. **Audiobooks (audiobooks.html)**

   - Browse all available audiobooks with filtering options
   - Audio player for previewing audiobooks
   - Detailed information about narrators and duration
   - Download functionality for audio files

4. **Login (login.html)**

   - User authentication form
   - Email and password fields with validation
   - Password visibility toggle
   - Animated background with particles effect
   - Link to signup page for new users

5. **Signup (signup.html)**

   - User registration form
   - Fields for name, email, password with validation
   - Terms and conditions acceptance
   - Animated illustration

6. **Profile (profile.html)**

   - User information display and editing
   - Profile picture upload functionality
   - Password change option
   - Reading preferences management
   - Account statistics (books read, favorites, etc.)

7. **My Books (Mybooks.html)**

   - Personal collection of books added or downloaded by the user
   - Reading progress tracking
   - Sort and filter options

8. **My Audiobooks (myaudiobooks.html)**

   - Personal collection of audiobooks added or downloaded by the user
   - Listening progress tracking
   - Sort and filter options

9. **My Favorites (myfavorites.html)**
   - Collection of books and audiobooks marked as favorites
   - Quick access to favorite content
   - Remove from favorites option

### Admin Pages

10. **Dashboard (dashboard.html)**
    - Admin control panel
    - Overview statistics and charts
    - Recent activity logs
    - Quick access to management functions

## Usage

### User Flow

1. **Registration/Login**: Users can create an account or log in
2. **Browse Content**: Explore books and audiobooks by category
3. **View Details**: Click on items to see detailed information
4. **Download/Read**: Access content for reading or listening
5. **Manage Favorites**: Save favorite items for quick access
6. **Profile Management**: Update profile information and preferences

### Admin Flow

1. **Dashboard Access**: Admins are redirected to the dashboard after login
2. **Content Management**: Add, edit, or remove books and audiobooks
3. **User Management**: View and manage user accounts
4. **Category Management**: Create and organize content categories

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Author

👨‍💻 **Mouad Bm**

- GitHub: [@M7Xb](https://github.com/M7Xb)
- Email: mouadloka3@gmail.com

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Bootstrap for the responsive framework
- Font Awesome for the icons
- Supabase for the backend services
- SweetAlert2 for the notification system
