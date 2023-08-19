// 現在のURLを取得
const currentURL = window.location.href;

// URLを解析してパラメータを取得
const urlParams = new URLSearchParams(new URL(currentURL).search);
const bbsParam = urlParams.get("bbs");
const datParam = urlParams.get("dat");

let datFileLocation = ""; // datファイルの場所をグローバル変数として宣言

if (bbsParam && datParam) {
  // bbsとdatのパラメータが存在する場合
  datFileLocation = `../${bbsParam}/dat/${datParam}.dat`;

let commentIdCounter = 1; // 投稿ごとのIDカウンター
let isReplyFormShown = false;

document.getElementById("submit-button").addEventListener("click", function() {
  const commentInput = document.getElementById("comment-input");
  const commentText = commentInput.value.trim();
  if (commentText !== "") {
    addComment("ななし", commentText);
    commentInput.value = "";
  }
});

// ファイルからのデータ読み込み処理を追加
window.addEventListener("DOMContentLoaded", () => {
  fetch(datFileLocation)
    .then(response => response.arrayBuffer())
    .then(buffer => {
      const decoder = new TextDecoder("sjis");
      const data = decoder.decode(buffer);
      processData(data);
    })
    .catch(error => console.error("Error reading data file:", error));
});

function processData(data) {
  const entries = data.split("\n");
  let comments = {}; // コメントのリプライ数を格納するオブジェクト

  const title = entries[0].split("<>")[4]; // datの一行目からタイトルを取得
  if (title) {
    const pageTitle = document.createElement("h1");
    pageTitle.textContent = title;
    document.body.insertBefore(pageTitle, document.getElementById("comments-container"));
  }

  const totalCommentCount = entries.length - 1; // datの行数から総コメント数を取得
  const totalCommentCountElement = document.createElement("div");
  totalCommentCountElement.className = "total-comment-count";
  totalCommentCountElement.textContent = `総コメント数: ${totalCommentCount}`;
  document.body.insertBefore(totalCommentCountElement, document.getElementById("comments-container"));

  entries.forEach((entry, index) => {
    const fields = entry.split("<>");
    if (fields.length >= 5) {
      const username = fields[0];
      const commentText = fields[3].replace(/<b>|<\/b>/g,'').replace(/<br>/g,'\n')
      .replace(/<hr>/g,'!&lt;hr&gt;!')
      .replace(/<[A-Za-z0-9_"':\/?=& .,]+>/g,'')
      .replace(/\n/g,'<br>').replace(/!&lt;hr&gt;!/g,'<hr>')
      .replace(/https?:\/\/[\w\/,.%&?=-]+/g, '<a href="$&" target="_blank">$&</a>');
      const isReply = commentText.includes("&gt;&gt;");
      const parentCommentId = isReply ? parseInt(commentText.match(/&gt;&gt;(\d+)/)[1]) : null;
      const timestampWithId = fields[2];
      const timestampMatch = timestampWithId.match(/(\d{4}\/\d{2}\/\d{2}\(.+\) \d{2}:\d{2}:\d{2}\.\d+) ID:(.*)/);
      const timestamp = timestampMatch ? timestampMatch[1] : "";
      const userId = timestampMatch ? timestampMatch[2] : "";
      const title = null;
      const commentId = commentIdCounter++; // 通常の投稿もリプライも連番でIDを付与

      if (!isReply) {
        // 新しい投稿を追加
        const comment = createCommentElement(username, commentText, title, timestamp, userId);
        comment.dataset.id = commentId;
        comments[commentId] = { element: comment, replyCount: 0 }; // コメントのリプライ数を初期化
        document.getElementById("comments-container").appendChild(comment);
      } else {
        // リプライを追加
        const replyUsername = username;
        const replyText = commentText.replace(/&gt;&gt;\d+/, "").replace("<br>","").trim();

        if (comments[parentCommentId]) {
          const parentCommentElement = comments[parentCommentId].element;
          if (parentCommentElement !== null) {
            addReply(parentCommentElement, replyUsername, replyText, timestamp, userId);
            comments[parentCommentId].replyCount++; // リプライ数を増やす
            updateReplyCount(parentCommentElement, comments[parentCommentId].replyCount); // 表示を更新
          }
        }
      }
    }
  });
}

function updateReplyCount(commentElement, replyCount) {
  const replyCountElement = commentElement.querySelector(".reply-count");
  if (replyCountElement) {
    replyCountElement.textContent = `${replyCount} リプライ`;
  }
}

function findCommentById(id) {
  return document.querySelector(`[data-id="${id}"]`);
}

function addComment(username, commentText) {
  const commentContainer = document.getElementById("comments-container");
  const newComment = createCommentElement(username, commentText,timestamp);
  commentContainer.appendChild(newComment);
}

document.addEventListener("click", function(event) {
  if (isReplyFormShown) {
    const replyContainers = document.querySelectorAll(".reply-container");
    replyContainers.forEach(replyContainer => {
      if (!replyContainer.contains(event.target)) {
        // クリックされた場所が reply-container の外部ならフォームを閉じる
        replyContainer.parentNode.removeChild(replyContainer);
        isReplyFormShown = false;
      }
    });
  }
});
function createCommentElement(username, commentText, userId,timestamp) {
  const comment = document.createElement("div");
  comment.className = "comment";
  comment.innerHTML = `
    <div class="user-avatar"></div>
    <div class="user-info">
      <div class="username">${username}</div>
      <div class="comment-text">${commentText}</div>
      <div class="timestamp">${timestamp}</div>
      <button class="reply-button">返信</button>
      <span class="reply-count">0 リプライ</span>
      <div class="rating-buttons">
        <button class="good-button">Good</button>
        <button class="bad-button">Bad</button>
      </div>
    </div>
  `;

  const replyButton = comment.querySelector(".reply-button");
  const replyCount = comment.querySelector(".reply-count");
  let replyCounter = 0;

  replyButton.addEventListener("click", function(event) {
    event.stopPropagation(); // ボタンクリックでのイベントバブリングを防ぐ
    if (!isReplyFormShown) { // 返信フォームが表示されていない場合のみ追加
      isReplyFormShown = true;
      const replyInput = document.createElement("textarea");
      replyInput.className = "reply-input";
      replyInput.placeholder = "返信を入力してください";
      const submitReplyButton = document.createElement("button");
      submitReplyButton.className = "submit-reply-button";
      submitReplyButton.textContent = "返信する";
      const replyContainer = document.createElement("div");
      replyContainer.className = "reply-container";
      replyContainer.appendChild(replyInput);
      replyContainer.appendChild(submitReplyButton);
      comment.appendChild(replyContainer);

      // フォーム外部をクリックした場合の処理を追加
      document.addEventListener("click", function(event) {
        if (!replyContainer.contains(event.target)) {
          replyContainer.remove();
          isReplyFormShown = false;
        }
      });

      submitReplyButton.addEventListener("click", function() {
        const replyText = replyInput.value.trim();
        if (replyText !== "") {
          addReply(comment, "ななし", replyText,timestamp);
          replyCounter++;
          replyCount.textContent = `${replyCounter} リプライ`;
          replyContainer.remove();
          isReplyFormShown = false;
        }
      });
    }
  });

  return comment;
}

function addReply(parentComment, username, replyText, userId,timestamp) {
  const reply = createReplyElement(username, replyText, userId,timestamp);
  parentComment.appendChild(reply);
}

function createReplyElement(username, replyText, userId, timestamp) {
  const reply = document.createElement("div");
  reply.className = "reply";
  reply.innerHTML = `
    <div class="user-avatar"></div>
    <div class="user-info">
      <div class="username">${username}</div>
      <div class="comment-text">${replyText}</div>
      <div class="timestamp">${userId}</div>
      <button class="reply-button">返信</button>
      <span class="reply-count">0 リプライ</span>
      <div class="rating-buttons">
        <button class="good-button">Good</button>
        <button class="bad-button">Bad</button>
      </div>
    </div>
  `;
  
  const replyButton = reply.querySelector(".reply-button");
  const replyCount = reply.querySelector(".reply-count");
  let replyCounter = 0;

  replyButton.addEventListener("click", function() {
    if (!isReplyFormShown) { // 返信フォームが表示されていない場合のみ追加
      isReplyFormShown = true;
      const replyInput = document.createElement("textarea");
      replyInput.className = "reply-input";
      replyInput.placeholder = "返信を入力してください";
      const submitReplyButton = document.createElement("button");
      submitReplyButton.className = "submit-reply-button";
      submitReplyButton.textContent = "返信する";
      const replyContainer = document.createElement("div");
      replyContainer.className = "reply-container";
      replyContainer.appendChild(replyInput);
      replyContainer.appendChild(submitReplyButton);
      reply.appendChild(replyContainer);

      submitReplyButton.addEventListener("click", function() {
        const replyText = replyInput.value.trim();
        if (replyText !== "") {
          addReply(reply, "ななし", replyText,timestamp);
          replyCounter++;
          replyCount.textContent = `${replyCounter} リプライ`;
          replyContainer.remove();
          isReplyFormShown = false;
        }
      });
    }
  });

  return reply;
}

} else {
  // パラメータが存在しない場合、エラーメッセージを表示
  const errorContainer = document.createElement("div");
  errorContainer.className = "error-message";
  errorContainer.textContent = "エラー: パラメータが不足しています";
  document.body.appendChild(errorContainer);
}
