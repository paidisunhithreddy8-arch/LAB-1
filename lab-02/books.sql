CREATE TABLE IF NOT EXISTS book (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  pages INTEGER NOT NULL CHECK (pages > 0)
);

INSERT INTO book (title, author, price, pages) VALUES
  ('The Alchemist', 'Paulo Coelho', 399, 208),
  ('Wings of Fire', 'A. P. J. Abdul Kalam', 250, 180),
  ('Atomic Habits', 'James Clear', 499, 320),
  ('The Hobbit', 'J. R. R. Tolkien', 450, 310),
  ('Pride and Prejudice', 'Jane Austen', 299, 432),
  ('1984', 'George Orwell', 350, 328),
  ('The Blue Umbrella', 'Ruskin Bond', 199, 120),
  ('Ikigai', 'Hector Garcia and Francesc Miralles', 399, 208),
  ('Clean Code', 'Robert C. Martin', 799, 464),
  ('The Little Prince', 'Antoine de Saint-Exupery', 275, 96);
