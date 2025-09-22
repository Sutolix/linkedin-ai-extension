// Load apiKey from chrome storage
const _apiKey = async () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get("apiKey", (data) => {
      if (!data.apiKey) {
        alert("Please set your OpenAI API key in the extension options.");
      }
      resolve(data.apiKey);
    });
  });
};

const observer = new MutationObserver(() => {
  Array.from(document.getElementsByClassName("comments-comment-texteditor"))
    .filter((commentBox) => !commentBox.hasAttribute("data-mutated"))
    .forEach((commentBox) => {
      commentBox.setAttribute("data-mutated", "true");
      addSuggestionButton(commentBox);
    });
});

observer.observe(document.body, { childList: true, subtree: true });

const addSuggestionButton = (commentBox) => {
  const button = document.createElement("button");
  button.classList.add(
    "artdeco-button",
    "artdeco-button--muted",
    "artdeco-button--tertiary",
    "artdeco-button--circle"
  );
  button.type = "button";
  button.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-lightbulb-fill" viewBox="0 0 16 16"><path d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13h-5a.5.5 0 0 1-.46-.302l-.761-1.77a2 2 0 0 0-.453-.618A5.98 5.98 0 0 1 2 6m3 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1-.5-.5"/></svg>';
  button.addEventListener("click", async () => {
    const suggestion = await fetchSuggestion(createPrompt(commentBox));
    commentBox.querySelector(".ql-editor").innerHTML = `<p>${suggestion}</p>`;
  });
  const editorDiv = commentBox.querySelector(
    ".comments-comment-box-comment__text-editor"
  );
  if (
    editorDiv &&
    editorDiv.nextElementSibling &&
    editorDiv.nextElementSibling.firstElementChild
  ) {
    const firstChildDiv = editorDiv.nextElementSibling.firstElementChild;
    firstChildDiv.insertBefore(button, firstChildDiv.firstChild);
  }
};

const fetchSuggestion = async (prompt) => {
  const apiKey = await _apiKey();
  if (!apiKey) {
    return "";
  }

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", {
    method: "POST",
    body: JSON.stringify({
      "system_instruction": {
        "parts": [
          {
            "text": "You are an assistant, that writes replies to LinkedIn posts to other persons. Use NEED TO TRANSLATE THE TEXT TO THE SAME LANGUAGE AS OF THE TEXT OF THE POST YOU ARE RECEIVING IN THE USER'S PROMPT. Please sound like a human being. Don't use hashtags, use emojis occasionally, don't repeat too many of the exact words, but simply create a brief and positive reply.  Maybe add something to the discussion. Be creative! You may mention the name of the author, if it's the name of a natural person. Don't mention the name if it's the name of a company or a LinkedIn group."
          }
        ]
      },
      "contents": [
        {
          "role": "user",
          "parts": [
            {
              "text": prompt
            },
          ]
        },
      ],
      "generationConfig": {
        "topP": 0.7,
        "mediaResolution": "MEDIA_RESOLUTION_LOW",
      },
    }),
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
  });
  
  return (await response.json()).candidates[0].content.parts[0].text.trim();
};

const createPrompt = (commentBox) => {
  // Get post details
  const post =
    commentBox.closest(".feed-shared-update-v2") ||
    commentBox.closest(".reusable-search__result-container");

  const author = post.querySelector(
    ".update-components-actor__name .visually-hidden"
  )?.innerText;
  const text = post.querySelector(
    ".feed-shared-inline-show-more-text"
  )?.innerText;

  let prompt = `${author}" wrote: ${text}`;

  // Optional: Get comment details
  const commentElement = commentBox.closest(".comments-comment-item");
  const commentAuthor = commentElement?.querySelector(
    ".comments-post-meta__name-text .visually-hidden"
  )?.innerText;
  const commentText = commentElement?.querySelector(
    ".comments-comment-item__main-content"
  )?.innerText;

  if (commentElement) {
    prompt += `\n${commentAuthor} replied: ${commentText}\nPlease write a reply to the reply with a maximum of 20 words.`;
  } else {
    prompt += `\nPlease write a reply to this post with a maximum of 40 words.`;
  }

  return prompt;
};
