const knex = require("knex");
const supertest = require("supertest");
const app = require("../src/app");
const { expect } = require("chai");
const { makeFolderArray } = require("./folder-fixtures");

describe("Folders Endpoints", function () {
  let db;

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DATABASE_URL,
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  before("clean the table", () =>
    db.raw("TRUNCATE noteful_folder, noteful_note RESTART IDENTITY CASCADE")
  );

  afterEach("cleanup", () =>
    db.raw("TRUNCATE noteful_folder, noteful_note RESTART IDENTITY CASCADE")
  );

  describe(`GET /api/folder`, () => {
    context(`Given no folders`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app).get("/api/folder").expect(200, []);
      });
    });

    context(`Given there are folders in the database`, () => {
      const testFolders = makeFolderArray();

      beforeEach("insert folder", () => {
        return db.into("noteful_folder").insert(testFolders);
      });
      it(`responds with 200 and all of the folders`, () => {
        return supertest(app).get("/api/folder").expect(200, testFolders);
      });
    });
  });

  describe(`GET /api/folder/:folder_id`, () => {
    context(`Given no folders`, () => {
      it(`responds with 404`, () => {
        const folderId = 123456;
        return supertest(app)
          .get(`/api/folder/${folderId}`)
          .expect(404, { error: { message: `Folder doesn't exist` } });
      });
    });

    context("Given there are folders in the database", () => {
      const testFolders = makeFolderArray();

      beforeEach("insert folders", () => {
        return db.into("noteful_folder").insert(testFolders);
      });
      it(`responds with 200 and the specified folder`, () => {
        const folderId = 2;
        const expectedFolder = testFolders[folderId - 1];

        return supertest(app)
          .get(`/api/folder/${folderId}`)
          .expect(200, expectedFolder);
      });
    });
  });

  describe("POST /api/folder", () => {
    it(`creates a folder, responding with 201 and the new folder`, () => {
      const newFolder = {
        folder_name: "Test folder that's new",
      };

      return supertest(app)
        .post("/api/folder")
        .send(newFolder)
        .expect(201)
        .expect((res) => {
          expect(res.body.folder_name).to.eql(newFolder.folder_name);
          expect(res.body).to.have.property("id");
          expect(res.headers.location).to.eql(`/api/folder/${res.body.id}`);
        })
        .then((res) => {
          supertest(app).get(`/api/folder/${res.body.id}`).expect(res.body);
        });
    });

    const requiredFields = ["folder_name"];

    requiredFields.forEach((field) => {
      const newFolders = {
        folder_name: "Test folder that's new",
      };

      it(`Responds with 400 and an error when the ${field} is missing`, () => {
        delete newFolders[field];

        return supertest(app)
          .post("/api/folder")
          .send(newFolders)
          .expect(400, {
            error: { message: `Missing ${field} in request body` },
          });
      });
    });
  });

  describe(`DELETE /api/folder/:folder_id`, () => {
    context(`Given no folders`, () => {
      it(`responds with 404`, () => {
        const folderId = 123456;

        return supertest(app)
          .delete(`/api/folder/${folderId}`)
          .expect(404, { error: { message: `Folder doesn't exist` } });
      });
    });

    context(`Given there are folders in the database`, () => {
      const testFolders = makeFolderArray();

      beforeEach("insert folder", () => {
        return db.into("noteful_folder").insert(testFolders);
      });

      it("Responds with 204 and then removes the folders", () => {
        const folderToRemove = 2;
        const expectedFolder = testFolders.filter(
          (folder) => folder.id !== folderToRemove
        );
        return supertest(app)
          .delete(`/api/folder/${folderToRemove}`)
          .expect(204)
          .then((res) => {
            supertest(app).get("/api/folder").expect(expectedFolder);
          });
      });
    });
  });
});
