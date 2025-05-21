<script>
    export let message = '';
    export let avatarSrc = 'https://placehold.jp/2dd4bf/ffffff/150x150.png?text=DUMMY'; // アバター画像のURLを追加
  </script>

  <div class="chat-container">
    <div class="chat-image avatar">
      <div class="w-10 rounded-full">
        <img alt="アバター" src={avatarSrc} />
      </div>
    </div>
    <div class="messages">
      <p class="message last">
        {message}
      </p>
    </div>
  </div>

  <style>
    .chat-container {
      display: flex;
      flex-direction: row; /* アバターとメッセージを横並びにする */
      align-items: flex-start; /* 上揃え */
      padding: 10px;
      width: 100%;
    }

    .chat-image.avatar {
      margin-right: 10px; /* アバターと吹き出しの間のスペース */
      flex-shrink: 0; /* アバターが縮まないようにする */
    }

    .chat-image.avatar .w-10 {
      width: 80px; /* アバターのサイズを明示的に指定 */
      height: 80px; /* アバターのサイズを明示的に指定 */
      overflow: hidden; /* 画像がはみ出さないようにする */
    }

    .chat-image.avatar img {
      object-fit: cover; /* 画像がコンテナに収まるようにする */
      width: 100%;
      height: 100%;
    }

    .messages {
      display: flex;
      flex-direction: column;
      flex-grow: 1; /* メッセージが残りのスペースを埋めるようにする */
    }

    .message {
      border-radius: 100px;
      padding: 8px 15px;
      margin-top: 5px;
      margin-bottom: 5px;
      display: inline-block;
      max-width: 100%; /* 親のmessages divの幅いっぱいに広がるように変更 */
      word-wrap: break-word; /* 長い単語の折り返し */
      background-color: #ffffff; /* 背景色 */
      color: #4b5563; /* text-gray-700 相当 */
      position: relative;
      /* ドロップシャドウを追加 */
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    }

    /* 吹き出しのしっぽ */
    .message.last:before {
      content: "";
      position: absolute;
      z-index: 0;
      bottom: 0;
      left: -7px;
      height: 20px;
      width: 20px;
      background: #ffffff; /* 吹き出しの背景色と同じ */
      border-bottom-right-radius: 15px;
    }
    .message.last:after {
      content: "";
      position: absolute;
      z-index: 1;
      bottom: 0;
      left: -10px;
      width: 10px;
      height: 20px;
      background: #d6d3d1; /* 親の背景色（bg-stone-100）と同じ */
      border-bottom-right-radius: 10px;
    }
  </style>