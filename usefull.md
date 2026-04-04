Chat App Tutorial
In this tutorial, we'll implement a simple chat server as a SpacetimeDB module. You can write your module in TypeScript, C#, or Rust - use the tabs throughout this guide to see code examples in your preferred language.

A SpacetimeDB module is code that gets compiled and uploaded to SpacetimeDB. This code becomes server-side logic that interfaces directly with SpacetimeDB's relational database.

Each SpacetimeDB module defines a set of tables and a set of reducers.

TypeScript
C#
Rust
C++
Tables are declared with table({ ...opts }, { ...columns }). Each inserted object is a row; each field is a column.
Tables are private by default (readable only by the owner and your module code). Set { public: true } to make them readable by everyone; writes still happen only via reducers.
A reducer is a function that reads/writes the database. Each reducer runs in its own transaction; its writes commit only if it completes without throwing.
note
SpacetimeDB runs your module inside the database host (not Node.js). There's no direct filesystem or network access from reducers.

Install SpacetimeDB
If you haven't already, start by installing SpacetimeDB. This installs the spacetime CLI used to build, publish, and interact with your database.

Install the SpacetimeDB CLI tool
TypeScript
C#
Rust
C++
No additional installation needed - Node.js/npm will handle dependencies.

Project structure
Let's start by running spacetime init to initialize our project's directory structure:

TypeScript
C#
Rust
C++
spacetime init --lang typescript quickstart-chat
spacetime init will ask you for a project path in which to put your project. By default this will be ./quickstart-chat. This basic project will have a few helper files like Cursor rules for SpacetimeDB and a spacetimedb directory which is where your SpacetimeDB module code will go.

TypeScript
C#
Rust
C++
Inside the spacetimedb/ directory will be a src/index.ts entrypoint (required for publishing).

Declare imports
TypeScript
C#
Rust
C++
Open spacetimedb/src/index.ts. Replace its contents with the following imports:

import { schema, t, table, SenderError } from 'spacetimedb/server';
From spacetimedb/server, we import:

table to define SpacetimeDB tables.
t for column/type builders.
schema to compose our database schema and register reducers.
SenderError to signal user-visible (transaction-aborting) errors.
Define tables
We'll store two kinds of data: information about each user, and the messages that have been sent.

For each User, we'll store their Identity (the caller's unique identifier), an optional display name, and whether they're currently online. We'll use Identity as the primary key (unique and indexed).

TypeScript
C#
Rust
C++
Add to spacetimedb/src/index.ts:

const user = table(
  { name: 'user', public: true },
  {
    identity: t.identity().primaryKey(),
    name: t.string().optional(),
    online: t.bool(),
  }
);

const message = table(
  { name: 'message', public: true },
  {
    sender: t.identity(),
    sent: t.timestamp(),
    text: t.string(),
  }
);

// Compose the schema (gives us ctx.db.user and ctx.db.message, etc.)
const spacetimedb = schema({ user, message });
export default spacetimedb;
Set users' names
We'll allow users to set a display name, since raw identities aren't user-friendly. Define a reducer that validates input, looks up the caller's User row by primary key, and updates it.

TypeScript
C#
Rust
C++
Add:

function validateName(name: string) {
  if (!name) {
    throw new SenderError('Names must not be empty');
  }
}

export const set_name = spacetimedb.reducer({ name: t.string() }, (ctx, { name }) => {
  validateName(name);
  const user = ctx.db.user.identity.find(ctx.sender);
  if (!user) {
    throw new SenderError('Cannot set name for unknown user');
  }
  ctx.db.user.identity.update({ ...user, name });
});
You can extend validation with moderation checks, Unicode normalization, max length checks, or duplicate-name rejection.

Send messages
Define a reducer to insert a new Message with the caller's identity and the call timestamp.

TypeScript
C#
Rust
C++
Add:

function validateMessage(text: string) {
  if (!text) {
    throw new SenderError('Messages must not be empty');
  }
}

export const send_message = spacetimedb.reducer({ text: t.string() }, (ctx, { text }) => {
  validateMessage(text);
  console.info(`User ${ctx.sender}: ${text}`);
  ctx.db.message.insert({
    sender: ctx.sender,
    text,
    sent: ctx.timestamp,
  });
});
Set users' online status
SpacetimeDB can invoke lifecycle reducers when clients connect/disconnect. We'll create or update a User row to mark the caller online on connect, and mark them offline on disconnect.

TypeScript
C#
Rust
C++
Add:

export const init = spacetimedb.init(_ctx => {});

export const onConnect = spacetimedb.clientConnected(ctx => {
  const user = ctx.db.user.identity.find(ctx.sender);
  if (user) {
    ctx.db.user.identity.update({ ...user, online: true });
  } else {
    ctx.db.user.insert({
      identity: ctx.sender,
      name: undefined,
      online: true,
    });
  }
});

export const onDisconnect = spacetimedb.clientDisconnected(ctx => {
  const user = ctx.db.user.identity.find(ctx.sender);
  if (user) {
    ctx.db.user.identity.update({ ...user, online: false });
  } else {
    console.warn(
      `Disconnect event for unknown user with identity ${ctx.sender}`
    );
  }
});
Start the server
If you haven't already started the SpacetimeDB host, run this in a separate terminal and leave it running:

spacetime start
Publish the module
From the quickstart-chat directory:

TypeScript
C#
Rust
C++
spacetime publish --server local --module-path spacetimedb quickstart-chat
You can choose any unique database name in place of quickstart-chat. Must be alphanumeric with internal hyphens.

Call reducers
Use the CLI to call reducers. Arguments are passed as JSON:

TypeScript
C#
Rust
C++
spacetime call --server local quickstart-chat send_message 'Hello, World!'
Check that it ran by viewing logs:

spacetime logs --server local quickstart-chat
SQL queries
SpacetimeDB supports a subset of SQL so you can query your data:

TypeScript
C#
Rust
C++
spacetime sql --server local quickstart-chat "SELECT * FROM message"
Output will resemble:

 sender                                                             | sent                             | text
--------------------------------------------------------------------+----------------------------------+-----------------
 0x93dda09db9a56d8fa6c024d843e805d8262191db3b4ba84c5efcd1ad451fed4e | 2025-04-08T15:47:46.935402+00:00 | "Hello, World!"
You've just set up your first SpacetimeDB module! You can find the full code for this module:

TypeScript server module
C# server module
Rust server module
note
For C++ modules, there is not yet a dedicated C++ client SDK. To test your C++ module with a client, use one of the available client libraries: TypeScript (React), C# (Console), or Rust (Console). We recommend starting with the Rust client for testing C++ modules.

Creating the Client
Next, you'll learn how to create a SpacetimeDB client application. Choose your preferred client language below.

TypeScript (React)
C# (Console)
Rust (Console)
Next, you'll learn how to use TypeScript to create a SpacetimeDB client application.

By the end of this introduction, you will have created a basic single page web app which connects to the quickstart-chat database you just created.

Project structure
Make sure you're in the quickstart-chat directory you created earlier in this guide:

cd quickstart-chat
Initialize a React app in the current directory:

pnpm create vite@latest . -- --template react-ts
pnpm install
We also need to install the spacetimedb package:

pnpm install spacetimedb
note
If you are using another package manager like yarn or npm, the same steps should work with the appropriate commands for those tools.

warning
The @clockworklabs/spacetimedb-sdk package has been deprecated in favor of the spacetimedb package as of SpacetimeDB version 1.4.0. If you are using the old SDK package, you will need to switch to spacetimedb. You will also need a SpacetimeDB CLI version of 1.4.0+ to generate bindings for the new spacetimedb package.

You can now pnpm run dev to see the Vite template app running at http://localhost:5173.

Basic layout
The app we're going to create is a basic chat application. We will begin by creating a layout for our app. The webpage will contain four sections:

A profile section, where we can set our name.
A message section, where we can see all the messages.
A system section, where we can see system messages.
A new message section, where we can send a new message.
Replace the entire contents of src/App.tsx with the following:

import React, { useState } from 'react';
import { tables, reducers } from './module_bindings';
import type * as Types from './module_bindings/types';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { Identity, Timestamp } from 'spacetimedb';
import './App.css';

export type PrettyMessage = {
  senderName: string;
  text: string;
  sent: Timestamp;
  kind: 'system' | 'user';
};

function App() {
  const [newName, setNewName] = useState('');
  const [settingName, setSettingName] = useState(false);
  const [systemMessages, setSystemMessages] = useState([] as Types.Message[]);
  const [newMessage, setNewMessage] = useState('');

  const onlineUsers: Types.User[] = [];
  const offlineUsers: Types.User[] = [];
  const users = [...onlineUsers, ...offlineUsers];
  const prettyMessages: PrettyMessage[] = [];

  const name = '';

  const onSubmitNewName = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSettingName(false);
    // TODO: Call `setName` reducer
  };

  const onSubmitMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNewMessage('');
    // TODO: Call `sendMessage` reducer
  };

  return (
    <div className="App">
      <div className="profile">
        <h1>Profile</h1>
        {!settingName ? (
          <>
            <p>{name}</p>
            <button
              onClick={() => {
                setSettingName(true);
                setNewName(name);
              }}
            >
              Edit Name
            </button>
          </>
        ) : (
          <form onSubmit={onSubmitNewName}>
            <input
              type="text"
              aria-label="username input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <button type="submit">Submit</button>
          </form>
        )}
      </div>
      <div className="message-panel">
        <h1>Messages</h1>
        {prettyMessages.length < 1 && <p>No messages</p>}
        <div className="messages">
          {prettyMessages.map((message, key) => {
            const sentDate = message.sent.toDate();
            const now = new Date();
            const isOlderThanDay =
              now.getFullYear() !== sentDate.getFullYear() ||
              now.getMonth() !== sentDate.getMonth() ||
              now.getDate() !== sentDate.getDate();

            const timeString = sentDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const dateString = isOlderThanDay
              ? sentDate.toLocaleDateString([], {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }) + ' '
              : '';

            return (
              <div
                key={key}
                className={
                  message.kind === 'system' ? 'system-message' : 'user-message'
                }
              >
                <p>
                  <b>
                    {message.kind === 'system' ? 'System' : message.senderName}
                  </b>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      marginLeft: '0.5rem',
                      color: '#666',
                    }}
                  >
                    {dateString}
                    {timeString}
                  </span>
                </p>
                <p>{message.text}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="online" style={{ whiteSpace: 'pre-wrap' }}>
        <h1>Online</h1>
        <div>
          {onlineUsers.map((user, key) => (
            <div key={key}>
              <p>{user.name || user.identity.toHexString().substring(0, 8)}</p>
            </div>
          ))}
        </div>
        {offlineUsers.length > 0 && (
          <div>
            <h1>Offline</h1>
            {offlineUsers.map((user, key) => (
              <div key={key}>
                <p>
                  {user.name || user.identity.toHexString().substring(0, 8)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="new-message">
        <form
          onSubmit={onSubmitMessage}
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '50%',
            margin: '0 auto',
          }}
        >
          <h3>New Message</h3>
          <textarea
            aria-label="message input"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
          ></textarea>
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}

export default App;
We have configured the onSubmitNewName and onSubmitMessage callbacks to be called when the user clicks the submit button in the profile and new message sections, respectively. For now, they do nothing when called, but later we'll add some logic to call SpacetimeDB reducers when these callbacks are called.

Let's also make it pretty. Replace the contents of src/App.css with the following:

.App {
  display: grid;
  /* 
    3 rows: 
      1) Profile
      2) Main content (left = message, right = online)
      3) New message
  */
  grid-template-rows: auto 1fr auto;
  /* 2 columns: left for chat, right for online */
  grid-template-columns: 2fr 1fr;

  height: 100vh; /* fill viewport height */
  width: clamp(300px, 100%, 1200px);
  margin: 0 auto;
}

/* ----- Profile (Row 1, spans both columns) ----- */
.profile {
  grid-column: 1 / 3;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--theme-color);
}

.profile h1 {
  margin-right: auto; /* pushes name/edit form to the right */
}

.profile form {
  display: flex;
  flex-grow: 1;
  align-items: center;
  gap: 0.5rem;
  max-width: 300px;
}

.profile form input {
  background-color: var(--textbox-color);
}

/* ----- Chat Messages (Row 2, Col 1) ----- */
.message-panel {
  grid-row: 2 / 3;
  grid-column: 1 / 2;

  /* Ensure this section scrolls if content is long */
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.system-message {
  background-color: var(--theme-color);
  color: var(--theme-color-contrast);
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-style: italic;
}

.user-message {
  background-color: var(--textbox-color);
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
}

.message h1 {
  margin-right: 0.5rem;
}

/* ----- Online Panel (Row 2, Col 2) ----- */
.online {
  grid-row: 2 / 3;
  grid-column: 2 / 3;

  /* Also scroll independently if needed */
  overflow-y: auto;
  padding: 1rem;
  border-left: 1px solid var(--theme-color);
  white-space: pre-wrap;
  font-family: monospace;
}

/* ----- New Message (Row 3, spans columns 1-2) ----- */
.new-message {
  grid-column: 1 / 3;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  border-top: 1px solid var(--theme-color);
}

.new-message form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  max-width: 600px;
}

.new-message form h3 {
  margin-bottom: 0.25rem;
}

/* Distinct background for the textarea */
.new-message form textarea {
  font-family: monospace;
  font-weight: 400;
  font-size: 1rem;
  resize: vertical;
  min-height: 80px;
  background-color: var(--textbox-color);
  color: inherit;

  /* Subtle shadow for visibility */
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 1px 2px rgba(0, 0, 0, 0.24);
}

@media (prefers-color-scheme: dark) {
  .new-message form textarea {
    box-shadow: 0 0 0 1px #17492b;
  }
}
Next, we need to replace the global styles in src/index.css as well:

/* ----- CSS Reset & Global Settings ----- */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ----- Color Variables ----- */
:root {
  --theme-color: #3dc373;
  --theme-color-contrast: #08180e;
  --textbox-color: #edfef4;
  color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
  :root {
    --theme-color: #4cf490;
    --theme-color-contrast: #132219;
    --textbox-color: #0f311d;
  }
}

/* ----- Page Setup ----- */
html,
body,
#root {
  height: 100%;
  margin: 0;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
    'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family:
    source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
}

/* ----- Buttons ----- */
button {
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 0.375rem;
  background-color: var(--theme-color);
  color: var(--theme-color-contrast);
  cursor: pointer;
  font-weight: 600;
  letter-spacing: 0.1px;
  font-family: monospace;
}

/* ----- Inputs & Textareas ----- */
input,
textarea {
  border: none;
  border-radius: 0.375rem;
  caret-color: var(--theme-color);
  font-family: monospace;
  font-weight: 600;
  letter-spacing: 0.1px;
  padding: 0.5rem 0.75rem;
}

input:focus,
textarea:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--theme-color);
}
Generate your module types
Before we can run the app, we need to generate the TypeScript bindings that App.tsx imports. The spacetime CLI's generate command generates client-side interfaces for the tables, reducers, and types defined in your server module.

In your quickstart-chat directory, run:

spacetime generate --lang typescript --out-dir src/module_bindings --module-path spacetimedb
Take a look inside src/module_bindings. The CLI should have generated several files:

module_bindings
├── index.ts
├── init_type.ts
├── message_table.ts
├── message_type.ts
├── on_connect_type.ts
├── on_disconnect_type.ts
├── send_message_reducer.ts
├── send_message_type.ts
├── set_name_reducer.ts
├── set_name_type.ts
├── user_table.ts
├── user_type.ts
└── types
    ├── index.ts
    ├── procedures.ts
    └── reducers.ts

With spacetime generate we have generated TypeScript types derived from the types you specified in your module, which we can conveniently use in our client. We've placed these in the module_bindings folder.

Now you can run pnpm run dev and open http://localhost:5173 to see your app's layout. It won't connect to SpacetimeDB yet - let's fix that next.

The main entry to the SpacetimeDB API is the DbConnection, a type that manages a connection to a remote database. Let's import it and a few other types into our src/main.tsx below our other imports:

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { Identity } from 'spacetimedb';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import { DbConnection, type ErrorContext } from './module_bindings/index.ts';
Note that we are importing DbConnection from our module_bindings because it is a code generated type with all the type information about our tables and types.

We've also imported the SpacetimeDBProvider React component which will allow us to connect our SpacetimeDB state directly to our React state seamlessly.

Create your SpacetimeDB client
Now that we've imported the DbConnection type, we can use it to connect our app to our database.

Replace the body of the main.tsx file with the following, just below your imports:

const HOST = import.meta.env.VITE_SPACETIMEDB_HOST ?? 'ws://localhost:3000';
const DB_NAME = import.meta.env.VITE_SPACETIMEDB_DB_NAME ?? 'quickstart-chat';
const TOKEN_KEY = `${HOST}/${DB_NAME}/auth_token`;

const onConnect = (conn: DbConnection, identity: Identity, token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  console.log(
    'Connected to SpacetimeDB with identity:',
    identity.toHexString()
  );
};

const onDisconnect = () => {
  console.log('Disconnected from SpacetimeDB');
};

const onConnectError = (_ctx: ErrorContext, err: Error) => {
  console.log('Error connecting to SpacetimeDB:', err);
};

const connectionBuilder = DbConnection.builder()
  .withUri(HOST)
  .withDatabaseName(DB_NAME)
  .withToken(localStorage.getItem(TOKEN_KEY) || undefined)
  .onConnect(onConnect)
  .onDisconnect(onDisconnect)
  .onConnectError(onConnectError);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      <App />
    </SpacetimeDBProvider>
  </StrictMode>
);
Here we are configuring our SpacetimeDB connection by specifying the server URI, database name, and a few callbacks including the onConnect callback. When onConnect is called after connecting, we store our credentials in localStorage and log our Identity. If there is an error connecting, we also print that error to the console.

We are also using localStorage to store our SpacetimeDB credentials. This way, we can reconnect to SpacetimeDB with the same Identity and token if we refresh the page. The first time we connect, we won't have any credentials stored, so we pass undefined to the withToken method. This will cause SpacetimeDB to generate new credentials for us.

If you chose a different name for your database, replace quickstart-chat with that name, or republish your module as quickstart-chat.

Our React hooks will subscribe to the data in SpacetimeDB. When we subscribe, SpacetimeDB will run our subscription queries and store the result in a local "client cache". This cache will be updated in real-time as the data in the table changes on the server.

We pass our connection configuration directly to the SpacetimeDBProvider, which will manage our connection to SpacetimeDB.

Accessing the Data
Once SpacetimeDB is connected, we can easily access the data in the client cache using SpacetimeDB's provided React hooks, useTable and useSpacetimeDB.

useTable is the simplest way to access your database data. useTable subscribes your React app to data in a SpacetimeDB table so that it updates as the data changes. It essentially acts just like useState in React except the data is being updated in real-time from SpacetimeDB tables.

useSpacetimeDB gives you direct access to the connection in case you want to check the state of the connection or access database table state. Note that useSpacetimeDB does not automatically subscribe your app to data in the database.

Add the following useSpacetimeDB hook to the top of your render function in App.tsx, just below your useState declarations.

const { identity, isActive: connected } = useSpacetimeDB();
const setName = useReducer(reducers.setName);
const sendMessage = useReducer(reducers.sendMessage);

// Subscribe to all messages in the chat
const [messages] = useTable(tables.message);
Next replace const onlineUsers: Types.User[] = []; with the following:

// Subscribe to all online users in the chat
// using the query builder's `.where()` method
const [onlineUsers] = useTable(
  tables.user.where(r => r.online.eq(true))
);
Notice that we can filter users in the user table based on their online status by chaining .where() on the table ref with a typed predicate function.

Let's now prettify our messages in our render function by sorting them by their sent timestamp, and joining the username of the sender to the message by looking up the user by their Identity in the user table. Replace const prettyMessages: PrettyMessage[] = []; with the following:

const prettyMessages: PrettyMessage[] = messages
  .sort((a, b) => (a.sent.toDate() > b.sent.toDate() ? 1 : -1))
  .map(message => {
    const user = users.find(
      u => u.identity.toHexString() === message.sender.toHexString()
    );
    return {
      senderName: user?.name || message.sender.toHexString().substring(0, 8),
      text: message.text,
      sent: message.sent,
      kind: Identity.zero().isEqual(message.sender) ? 'system' : 'user',
    };
  });
That's all we have to do to hook up our SpacetimeDB state to our React state. SpacetimeDB ensures that any changes on the server are pushed down to our application and rerendered on screen in real-time.

Let's also update our render function to show a loading message while we're connecting to SpacetimeDB. Add this just below our prettyMessages declaration:

if (!connected || !identity) {
  return (
    <div className="App">
      <h1>Connecting...</h1>
    </div>
  );
}
Finally, let's also compute the name of the user from the Identity in our name variable. Replace const name = ''; with the following:

const name = (() => {
  const user = users.find(u => u.identity.isEqual(identity));
  return user?.name || identity?.toHexString().substring(0, 8) || '';
})();
Calling Reducers
Let's hook up our callbacks so we can send some messages and see them displayed in the app after they are synchronised by SpacetimeDB. We need to update the onSubmitNewName and onSubmitMessage callbacks to send the appropriate reducer to the module.

Modify the onSubmitNewName callback by adding a call to the setName reducer:

const onSubmitNewName = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setSettingName(false);
  setName({ name: newName });
};
Next, modify the onSubmitMessage callback by adding a call to the sendMessage reducer:

const onSubmitMessage = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setNewMessage('');
  sendMessage({ text: newMessage });
};
SpacetimeDB generated these functions for us based on the type information provided by our module. Calling these functions will invoke our reducers in our module.

Let's try out our app to see the result of these changes.

pnpm run dev
warning
Don't forget! You may need to publish your server module if you haven't yet.

Send some messages and update your username and watch it change in real-time. Note that when you update your username, it also updates immediately for all prior messages. This is because the messages store the user's Identity directly, instead of their username, so we can retroactively apply their username to all prior messages.

Try opening a few incognito windows to see what it's like with multiple users!

Notify about new users
We can also register onInsert, onUpdate, and onDelete callbacks to handle events, not just state. For example, we might want to show a notification any time a new user connects to the database.

Note that these callbacks can fire in two contexts:

After a reducer runs, when the client's cache is updated about changes to subscribed rows.
After calling subscribe, when the client's cache is initialized with all existing matching rows.
Our current useTable only filters online users, but we can print a system message anytime a user enters or leaves the room by subscribing to callbacks on the onlineUsers React hook.

Update your onlineUsers React hook to add the following callbacks:

// Subscribe to all online users in the chat
// using the query builder's `.where()` method
const [ onlineUsers ] = useTable(
  tables.user.where(r => r.online.eq(true)),
  {
    onInsert: user => {
      // All users being inserted here are online
      const name = user.name || user.identity.toHexString().substring(0, 8);
      setSystemMessages(prev => [
        ...prev,
        {
          sender: Identity.zero(),
          text: `${name} has connected.`,
          sent: Timestamp.now(),
        },
      ]);
    },
    onDelete: user => {
      // All users being deleted here are offline
      const name = user.name || user.identity.toHexString().substring(0, 8);
      setSystemMessages(prev => [
        ...prev,
        {
          sender: Identity.zero(),
          text: `${name} has disconnected.`,
          sent: Timestamp.now(),
        },
      ]);
    },
  }
);
These callbacks will be called any time the state of the useTable result changes to add or remove a row, while respecting your .where() filter.

Here, we post a system message indicating that a new user has connected if the user is being added to the user table and they're online, or if an existing user's online status is being updated to "online".

Next, let's add the system messages to our list of Messages so they can be interleaved with the chat messages. Modify prettyMessages to concat the systemMessages as well:

const prettyMessages: PrettyMessage[] = Array.from(messages)
  .concat(systemMessages)
  .sort((a, b) => (a.sent.toDate() > b.sent.toDate() ? 1 : -1))
  .map(message => {
    const user = users.find(
      u => u.identity.toHexString() === message.sender.toHexString()
    );
    return {
      senderName: user?.name || message.sender.toHexString().substring(0, 8),
      text: message.text,
      sent: message.sent,
      kind: Identity.zero().isEqual(message.sender) ? 'system' : 'user',
    };
  });
Finally, let's also subscribe to offline users so we can show them in the sidebar as well. Replace const offlineUsers: Types.User[] = []; with:

const [offlineUsers] = useTable(
  tables.user.where(r => r.online.eq(false))
);
Try it out!
Now that everything is set up, let's send some messages and see SpacetimeDB in action.

Send your first message: Type a message in the input field and click Send. You should see it appear in the message list almost instantly.

Set your name: Click "Edit Name" in the profile section and enter a username. Notice how your name updates immediately - not just for new messages, but for all your previous messages too! This is because messages store your Identity, and we look up the current name when displaying them.

Open multiple windows: Open the app in a second browser tab or an incognito window. You'll get a new identity and appear as a different user. Send messages from both and watch them appear in real-time on both screens.

Watch the online status: Notice the "Online" sidebar showing connected users. Open and close browser tabs to see users connect and disconnect, with system messages announcing each event.

Test persistence: Close all browser windows, then reopen the app. Your messages are still there! SpacetimeDB persists all your data, and your identity token (saved in localStorage) lets you reconnect as the same user.

You've just experienced the core features of SpacetimeDB: real-time synchronization, automatic persistence, and seamless multiplayer - all without writing any backend networking code.

Conclusion
Congratulations! You've built a simple chat app with SpacetimeDB. You can find the full source code for the client we've created in this quickstart tutorial here.

At this point you've learned how to create a basic TypeScript client for your SpacetimeDB quickstart-chat module. You've learned how to connect to SpacetimeDB and call reducers to update data. You've learned how to subscribe to table data, and hook it up so that it updates reactively in a React application.

What's next?
Congratulations! You've built a chat app with SpacetimeDB.

Check out the SDK Reference documentation for more advanced usage
Explore the Unity Tutorial or Unreal Tutorial for game development
Learn about Procedures for making external API calls


- - -


Cheat Sheet
Quick reference for SpacetimeDB module syntax across Rust, C#, and TypeScript.

Project Setup
TypeScript
C#
Rust
C++
spacetime init --lang typescript --project-path my-project my-project
cd my-project
spacetime login
spacetime publish <DATABASE_NAME>
Tables
TypeScript
C#
Rust
C++
import { table, t, schema } from 'spacetimedb/server';

// Basic table
const player = table(
  { name: 'player', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    username: t.string().unique(),
    score: t.i32().index('btree'),
  }
);

// Multi-column index
const score = table(
  {
    name: 'score',
    indexes: [{
      name: 'idx',
      algorithm: 'btree',
      columns: ['player_id', 'level'],
    }],
  },
  {
    player_id: t.u64(),
    level: t.u32(),
  }
);

// Custom types
const status = t.enum('Status', ['Active', 'Inactive']);
Reducers
TypeScript
C#
Rust
C++
import { schema } from 'spacetimedb/server';

const spacetimedb = schema({ player });
export default spacetimedb;

// Basic reducer
export const create_player = spacetimedb.reducer({ username: t.string() }, (ctx, { username }) => {
  ctx.db.player.insert({ id: 0n, username, score: 0 });
});

// With error handling
export const update_score = spacetimedb.reducer({ id: t.u64(), points: t.i32() }, (ctx, { id, points }) => {
  const player = ctx.db.player.id.find(id);
  if (!player) throw new Error('Player not found');
  player.score += points;
  ctx.db.player.id.update(player);
});

// Query examples
const player = ctx.db.player.id.find(123n);           // Find by primary key
const players = ctx.db.player.username.find('Alice'); // Find by unique index
const players = ctx.db.player.score.filter(100);      // Filter by BTree index
const all = ctx.db.player.iter();                     // Iterate all
ctx.db.player.id.delete(123n);                        // Delete by primary key
Lifecycle Reducers
TypeScript
C#
Rust
C++
export const init = spacetimedb.init(ctx => { /* ... */ });

export const onConnect = spacetimedb.clientConnected(ctx => { /* ... */ });

export const onDisconnect = spacetimedb.clientDisconnected(ctx => { /* ... */ });
Schedule Tables
TypeScript: ScheduleAt import
ScheduleAt is imported from 'spacetimedb', not from 'spacetimedb/server'. Use: import { ScheduleAt } from 'spacetimedb';

TypeScript
C#
Rust
C++
const reminder = table(
  { name: 'reminder', scheduled: (): any => send_reminder },
  {
    id: t.u64().primaryKey().autoInc(),
    message: t.string(),
    scheduled_at: t.scheduleAt(),
  }
);

export const send_reminder = spacetimedb.reducer({ arg: reminder.rowType }, (ctx, { arg }) => {
  console.log(`Reminder: ${arg.message}`);
});
Procedures
TypeScript
C#
Rust
C++
export const fetch_data = spacetimedb.procedure(
  { url: t.string() },
  t.string(),
  (ctx, { url }) => {
    const response = ctx.http.fetch(url);
    const data = response.text();
    
    ctx.withTx(ctx => {
      ctx.db.cache.insert({ data });
    });
    
    return data;
  }
);
Views
TypeScript
C#
Rust
C++
// Return single row
export const my_player = spacetimedb.view({ name: 'my_player' }, {}, t.option(player.rowType), ctx => {
  return ctx.db.player.identity.find(ctx.sender);
});

// Return potentially multiple rows
export const top_players = spacetimedb.view({ name: 'top_players' }, {}, t.array(player.rowType), ctx => {
  return ctx.db.player.score.filter(1000);
});

// Perform a generic filter using the query builder.
// Equivalent to `SELECT * FROM player WHERE score < 1000`.
export const bottom_players = spacetimedb.view({ name: 'bottom_players' }, {}, t.array(player.rowType), ctx => {
  return ctx.from.player.where(p => p.score.lt(1000))
});
Context Properties
TypeScript
C#
Rust
C++
ctx.db                  // Database access
ctx.sender              // Identity of caller
ctx.connectionId        // ConnectionId | undefined
ctx.timestamp           // Timestamp
ctx.identity            // Module's identity
Logging
TypeScript
C#
Rust
C++
console.error(`Error: ${msg}`);
console.warn(`Warning: ${msg}`);
console.log(`Info: ${msg}`);
console.debug(`Debug: ${msg}`);
Common Mistakes
TypeScript
C#
Rust
C++
ScheduleAt import — Import ScheduleAt from 'spacetimedb', not 'spacetimedb/server'.
Schema-first — Create const spacetimedb = schema({...}) before reducers/init/clientConnected.
schema() shape — Use schema({ table }) or schema({ a, b }), not schema(table) or schema(a, b).
Reducer naming — Reducer names come from exports: export const doThing = spacetimedb.reducer(...). Do not pass a string name.
No ReducerContext import — Use the ctx parameter; do not import ReducerContext.
Export rules — Only export schema, reducers, init, clientConnected, clientDisconnected, views. Keep helpers local.
Use spacetimedb/server — For modules, use spacetimedb/server (builder API), not spacetimedb-sdk (client decorators).
t.object not t.struct — Use t.object('Name', {...}) for product types.
autoInc not autoIncrement — Use .autoInc() on column builders.
Common CLI Commands
# Development
spacetime start                          # Start local server
spacetime dev                            # Interactive development mode
spacetime login                          # Authenticate

# Module management
spacetime build                          # Build module
spacetime publish <NAME>                 # Publish module
spacetime publish --delete-data <NAME>   # Reset database
spacetime delete <NAME>                  # Delete database

# Database operations
spacetime logs <NAME>                    # View logs
spacetime logs --follow <NAME>           # Stream logs
spacetime sql <NAME> "SELECT * FROM t"   # Run SQL query
spacetime describe <NAME>                # Show schema
spacetime call <NAME> reducer arg1 arg2  # Call reducer

# Code generation
spacetime generate --lang rust <NAME>    # Generate Rust client
spacetime generate --lang csharp <NAME>  # Generate C# client
spacetime generate --lang ts <NAME>      # Generate TypeScript client
Common Types
TypeScript
C#
Rust
C++
// Type builders
t.bool(), t.string(), t.f32(), t.f64()
t.i8(), t.i16(), t.i32(), t.i64(), t.i128()
t.u8(), t.u16(), t.u32(), t.u64(), t.u128()

// Collections
t.option(T), t.array(T)

// SpacetimeDB types
t.identity(), t.connectionId(), t.timestamp(), t.timeDuration(), t.scheduleAt()

// Structured types
t.object('Name', { field: t.type() })
t.enum('Name', ['Variant1', 'Variant2'])