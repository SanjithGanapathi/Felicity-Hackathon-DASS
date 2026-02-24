
-- Structure

backend/
├── src/
│   ├── app.js                 # express app
│   ├── server.js              # server bootstrap
│
│   ├── config/
│   │   ├── db.js              # mongoose connection
│   │   ├── env.js             # env validation
│
│   ├── models/
│   │   ├── User.js
│   │   ├── Organizer.js
│   │   ├── Event.js
│   │   ├── Registration.js
│   │   └── Preferences.js
│
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── admin.routes.js
│   │   ├── organizer.routes.js
│   │   └── participant.routes.js
│
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── admin.controller.js
│   │   ├── organizer.controller.js
│   │   └── participant.controller.js
│
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── event.service.js
│   │   ├── registration.service.js
│   │   └── organizer.service.js
│
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   └── role.middleware.js
│
│   └── utils/
│       ├── jwt.js
│       └── constants.js
│
├── package.json
└── .env

