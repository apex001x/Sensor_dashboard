# How to turn on the test server

- Set `.env`

```js
SUPABASE_URL=********
SUPABASE_SERVICE_KEY=**************
SENSOR_API_KEY=**************
```
Tip: `SENSOR_API_KEY` is customization. You can make it with `openssl rand -hex 32` command in terminal.

- Run the following command
```
uvicorn main:app --reload
```