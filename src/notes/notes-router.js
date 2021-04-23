const path = require("path");
const express = require("express");
const xss = require("xss");
const NoteService = require("./notes-service");

const noteRouter = express.Router();
const jsonParser = express.json();

const serializeNote = (note) => ({
  id: note.id,
  note_name: xss(note.note_name),
  folder_id: xss(note.folder_id),
  content: xss(note.content),
});

noteRouter
  .route("/")
  .get((req, res, next) => {
    const knexInstance = req.app.get("db");
    NoteService.getAllNotes(knexInstance)
      .then((notes) => {
        res.json(notes.map(serializeNote));
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { note_name, folder_id, content } = req.body;
    const newNote = { note_name, folder_id, content };

    for (const [key, value] of Object.entries(newNote)) {
      if (!value) {
        return res.status(400).json({
          error: { message: `Missing ${key} in request body` },
        });
      }
    }
    newNote.modified = modified;

    NoteService.insertNote(req.app.get("db"), newNote)
      .then((note) => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${note.id}`))
          .json(serializeNote(note));
      })
      .catch(next);
  });

noteRouter
  .route("/:note_id")
  .all((req, res, next) => {
    const knexInstance = req.app.get("db");
    NoteService.getById(knexInstance, req.params.note_id)
      .then((note) => {
        if (!note) {
          return res.status(404).json({
            error: { message: `Note doesn't exist` },
          });
        }
        res.note = note;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(serializeNote(res.note));
  })
  .delete((req, res, next) => {
    const knexInstance = req.app.get("db");
    NoteService.deleteNote(knexInstance, req.params.note_id)
      .then((numRowsAffected) => {
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const { note_name, folder_id, content } = req.body;
    const noteToUpdate = { note_name, folder_id, content };

    const numberOfValues = Object.value(noteToUpdate).filter(Boolean).length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: `Request body must include a 'note_name', 'folder_id' or 'content'`,
        },
      });
    }
    NoteService.updateNote(req.app.get("db"), req.params.note_id, noteToUpdate)
      .then((numRowsAffected) => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = noteRouter;
