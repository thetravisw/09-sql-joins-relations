'use strict';

const pg = require('pg');
const fs = require('fs');
const express = require('express');
const PORT = process.env.PORT || 3000;
const app = express();

// TODO: Don't forget to set your own conString  
///  Done
const conString = 'postgres://postgres:1234@localhost:5432/kilovolt';
//Sara's string
//  const conString = 'postgres://localhost:5432/kilovolt';   

const client = new pg.Client(conString);
client.connect();
client.on('error', error => {
  console.error(error);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));

// REVIEW: This is the route for requesting HTML resources.
app.get('/new-article', (request, response) => {
  response.sendFile('new.html', { root: './public' });
});

// REVIEW: These are routes for making API calls to enact CRUD operations on our database.

app.get('/articles', (request, response) => {
  // REVIEW: This query will join the data together from our tables and send it back to the client.
  // TODO: Write a SQL query which joins all data from articles and authors tables on the author_id value of each.
  // DONE
  let SQL = `SELECT * FROM articles INNER JOIN authors ON articles.author_id = authors.author_id;`
  client.query(SQL)
    .then(result => {
      response.send(result.rows);
    })
    .catch(err => {
      console.error(err)
    });
});

app.post('/articles', (request, response) => {
  // TODO: Write a SQL query to insert a new author, ON CONFLICT DO NOTHING.
  // DONE
  // TODO: In the provided array, add the author and author_url as data for the SQL query.
  // DONE
  let SQL = 'INSERT INTO authors(author, author_url) VALUES($1, $2) ON CONFLICT DO NOTHING';
  let values = [request.body.author, request.body.author_url];
  client.query(SQL, values,
    function(err) {
      if (err) console.error(err)
      queryTwo()
    }
  )  

  function queryTwo() {
    // TODO: Write a SQL query to retrieve the author_id from the authors table for the new article.
    //Done
    // TODO: In the provided array, add the author name as data for the SQL query.
    //Done
    let SQL = `SELECT author_id FROM authors WHERE author=$1`;
    let values = [request.body.author];
    client.query(SQL, values,
      function(err, result) {
        if (err) console.error(err)

        // REVIEW: This is our third query, to be executed when the second is complete. We are also passing the author_id into our third query.
        queryThree(result.rows[0].author_id);
      }
    )
  }

  function queryThree(author_id) {
    // TODO: Write a SQL query to insert the new article using the author_id from our previous query.
    //Done
    // TODO: In the provided array, add the data from our new article, including the author_id, as data for the SQL query.
    //Done
    let SQL = `
    INSERT INTO articles(author_id, title, category, published_on, body)
    VALUES ($1, $2, $3, $4, $5);
  `;
  let values = [
    author_id,
    request.body.title,
    request.body.category,
    request.body.published_on,
    request.body.body
  ];

  client.query(SQL, values,
    function(err) {
      if (err) console.error(err);
      response.send('insert complete');
    }
  );
}
});

app.put('/articles/:id', function(request, response) {
  // TODO: Write a SQL query to update an author record. Remember that our articles now have an author_id property, so we can reference it from the request.body.
  //DONE
  // TODO: In the provided array, add the required values from the request as data for the SQL query to interpolate.
  //DONE
  app.put('/articles/:id', (request, response) => {
    let SQL = `
      UPDATE authors
      SET author=$1, author_url=$2
      WHERE author_id=$3
    `;
    let values = [request.body.author, request.body.author_url, request.body.author_id];
    client.query(SQL, values)
      .then(() => {
      // TODO: Write a SQL query to update an article record. Keep in mind that article records now have an author_id, in addition to title, category, published_on, and body.
      //DONE
      // TODO: In the provided array, add the required values from the request as data for the SQL query to interpolate.
      //DONE
      let SQL = `
      UPDATE articles
      SET author_id=$1, title=$2, category=$3, published_on=$4, body=$5
      WHERE article_id=$6
    `;
    let values = [
      request.body.author_id,
      request.body.title,
      request.body.category,
      request.body.published_on,
      request.body.body,
      request.params.id
    ];
    client.query(SQL, values);
  })
  .then(() => response.send('Update complete'))
  .catch(console.error);
});

app.delete('/articles/:id', (request, response) => {
  let SQL = `DELETE FROM articles WHERE article_id=$1;`;
  let values = [request.params.id];
  client.query(SQL, values)
    .then(() => {
      response.send('Delete complete');
    })
    .catch(err => {
      console.error(err)
    });
});

app.delete('/articles', (request, response) => {
  let SQL = 'DELETE FROM articles';
  client.query(SQL)
    .then(() => {
      response.send('Delete complete');
    })
    .catch(err => {
      console.error(err)
    });
});

// REVIEW: This calls the loadDB() function, defined below.
loadDB();

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}!`);
});


//////// ** DATABASE LOADERS ** ////////
////////////////////////////////////////

// REVIEW: This helper function will load authors into the DB if the DB is empty.
function loadAuthors() {
  fs.readFile('./public/data/hackerIpsum.json', 'utf8', (err, fd) => {
    JSON.parse(fd).forEach(ele => {
      let SQL = 'INSERT INTO authors(author, author_url) VALUES($1, $2) ON CONFLICT DO NOTHING';
      let values = [ele.author, ele.author_url];
      client.query(SQL, values);
    })
  })
}

// REVIEW: This helper function will load articles into the DB if the DB is empty.
function loadArticles() {
  let SQL = 'SELECT COUNT(*) FROM articles';
  client.query(SQL)
    .then(result => {
      if (!parseInt(result.rows[0].count)) {
        fs.readFile('./public/data/hackerIpsum.json', 'utf8', (err, fd) => {
          JSON.parse(fd).forEach(ele => {
            let SQL = `
              INSERT INTO articles(author_id, title, category, published_on, body)
              SELECT author_id, $1, $2, $3, $4
              FROM authors
              WHERE author=$5;
            `;
            let values = [ele.title, ele.category, ele.published_on, ele.body, ele.author];
            client.query(SQL, values)
          })
        })
      }
    })
}

// REVIEW: Below are two queries, wrapped in the loadDB() function, which create separate tables in our DB, and create a relationship between the authors and articles tables.
// THEN they load their respective data from our JSON file.
function loadDB() {
  client.query(`
    CREATE TABLE IF NOT EXISTS
    authors (
      author_id SERIAL PRIMARY KEY,
      author VARCHAR(255) UNIQUE NOT NULL,
      author_url VARCHAR (255)
    );`)
    .then(data => {
      loadAuthors(data);
    })
    .catch(err => {
      console.error(err)
    });

  client.query(`
    CREATE TABLE IF NOT EXISTS
    articles (
      article_id SERIAL PRIMARY KEY,
      author_id INTEGER NOT NULL REFERENCES authors(author_id),
      title VARCHAR(255) NOT NULL,
      category VARCHAR(20),
      published_on DATE,
      body TEXT NOT NULL
    );`)
    .then(data => {
      loadArticles(data);
    })
    .catch(err => {
      console.error(err)
    });
}