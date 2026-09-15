const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const results = document.getElementById("results");
const loading = document.getElementById("loading");


// ========================================
// LOADING
// ========================================

function showLoading() {
  loading.classList.add("active");
}

function hideLoading() {
  loading.classList.remove("active");
}


// ========================================
// LAST.FM API
// ========================================

async function lastFMRequest(method, params = {}) {

  const url = new URL(
    "https://ws.audioscrobbler.com/2.0/"
  );

  url.searchParams.set("method", method);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("format", "json");

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Last.fm request failed.");
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(
      data.message || "Last.fm API error."
    );
  }

  return data;
}


// ========================================
// SEARCH
// ========================================

async function searchMusic(searchTerm) {

  if (!searchTerm) {
    return;
  }

  showLoading();

  results.innerHTML = "";

  try {

    const data = await lastFMRequest(
      "track.search",
      {
        track: searchTerm,
        limit: 12
      }
    );

    let tracks =
      data?.results?.trackmatches?.track;


    if (!tracks) {

      results.innerHTML = `
        <p>No music results found.</p>
      `;

      return;
    }


    // Last.fm sometimes returns
    // one object instead of an array.

    if (!Array.isArray(tracks)) {
      tracks = [tracks];
    }


    displayResults(tracks);

  } catch (error) {

    console.error(error);

    results.innerHTML = `
      <p class="error-message">
        ⚠️ ${escapeHTML(error.message)}
      </p>
    `;

  } finally {

    hideLoading();

  }
}


// ========================================
// DISPLAY RESULTS
// ========================================

async function displayResults(tracks) {

  results.innerHTML = "";

  if (tracks.length === 0) {

    results.innerHTML = `
      <p>No music results found.</p>
    `;

    return;
  }


  // Create cards immediately.

  const cards = [];


  tracks.forEach((track) => {

    const card = document.createElement("div");

    card.className = "result-card";

    card.innerHTML = `

      <div class="image-container">

        <div class="image-placeholder">
          🎵
        </div>

      </div>


      <div class="track-info">

        <h2>
          ${escapeHTML(track.name)}
        </h2>

        <p>
          <strong>Artist:</strong>
          ${escapeHTML(track.artist)}
        </p>

        <p>
          <strong>Listeners:</strong>
          ${Number(
            track.listeners || 0
          ).toLocaleString()}
        </p>

        ${
          track.url
            ? `
              <a
                href="${track.url}"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Last.fm ↗
              </a>
            `
            : ""
        }

      </div>

    `;


    results.appendChild(card);

    cards.push({
      card,
      track
    });

  });


  // ========================================
  // GET ALBUM ART
  // ========================================

  await Promise.all(

    cards.map(async ({ card, track }) => {

      try {

        const data = await lastFMRequest(
          "track.getInfo",
          {
            artist: track.artist,
            track: track.name
          }
        );


        const albumImages =
          data?.track?.album?.image;


        if (!albumImages) {
          return;
        }


        // Find the largest image available.

        let imageUrl = "";

        const preferredSizes = [
          "extralarge",
          "large",
          "medium",
          "small"
        ];


        for (const size of preferredSizes) {

          const image = albumImages.find(
            (img) =>
              img.size === size &&
              img["#text"]
          );

          if (image) {

            imageUrl = image["#text"];

            break;

          }

        }


        // If there wasn't a matching size,
        // use any available image.

        if (!imageUrl) {

          const image = albumImages.find(
            (img) => img["#text"]
          );

          if (image) {
            imageUrl = image["#text"];
          }

        }


        if (!imageUrl) {
          return;
        }


        const container =
          card.querySelector(
            ".image-container"
          );


        if (!container) {
          return;
        }


        container.innerHTML = `

          <img
            src="${imageUrl}"
            alt="${escapeHTML(track.name)}"
            class="track-image"
          >

        `;

      } catch (error) {

        // Some tracks don't have album information.
        // Keep the 🎵 placeholder.

        console.log(
          "No artwork available for:",
          track.name
        );

      }

    })

  );

}


// ========================================
// SEARCH FORM
// ========================================

searchForm.addEventListener(
  "submit",
  function (event) {

    event.preventDefault();

    const searchTerm =
      searchInput.value.trim();


    if (!searchTerm) {

      results.innerHTML = `
        <p class="error-message">
          Please enter a song or artist.
        </p>
      `;

      return;
    }


    searchMusic(searchTerm);

  }
);


// ========================================
// CHALLENGE BUTTONS
// ========================================

const challengeButtons =
  document.querySelectorAll(
    ".challenges button"
  );


challengeButtons.forEach(
  function (button) {

    button.addEventListener(
      "click",
      function () {

        const searchTerm =
          button.dataset.challenge;


        searchInput.value =
          searchTerm;


        searchMusic(searchTerm);

      }
    );

  }
);


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(value) {

  const div =
    document.createElement("div");

  div.textContent =
    value || "";

  return div.innerHTML;

}
