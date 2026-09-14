/* Together We Compete — small bits of behavior.
   1. Mobile nav toggle
   3. Load events from data/events.json
   4. Stop the form from posting until an endpoint is set
*/
(function () {
  "use strict";

  /* 1. Mobile nav */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  var form = document.getElementById("gear-form");

  /* 3. Events */
  var list = document.getElementById("events-list");
  var empty = document.getElementById("events-empty");

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function parseDate(iso) {
    // "YYYY-MM-DD" -> local date at midnight (avoids UTC shift).
    var p = iso.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function renderEvent(ev) {
    var d = parseDate(ev.date);
    var item = el("li", "event");

    var date = el("time", "event__date");
    date.setAttribute("datetime", ev.date);
    date.appendChild(el("span", "event__date-month", d.toLocaleDateString("en-US", { month: "short" })));
    date.appendChild(el("span", "event__date-day", String(d.getDate())));
    item.appendChild(date);

    var sportLine = ev.sport || "";
    if (ev.start_time) sportLine += (sportLine ? " · " : "") + ev.start_time + (ev.end_time ? "–" + ev.end_time : "");
    item.appendChild(el("p", "event__sport", sportLine));

    item.appendChild(el("h3", "event__title", ev.title));

    var where = ev.location_name || "";
    if (ev.address) where += (where ? ", " : "") + ev.address;
    if (where) item.appendChild(el("p", "event__where", where));

    if (ev.signup_url) {
      var link = el("a", "event__link", ev.signup_label || "Sign up");
      link.href = ev.signup_url;
      link.rel = "noopener";
      item.appendChild(link);
    }
    return item;
  }

  function showEmpty() {
    if (list) list.hidden = true;
    if (empty) empty.hidden = false;
  }

  if (list && empty) {
    fetch("data/events.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (events) {
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var upcoming = (Array.isArray(events) ? events : [])
          .filter(function (ev) { return ev && ev.date && parseDate(ev.date) >= today; })
          .sort(function (a, b) { return parseDate(a.date) - parseDate(b.date); });

        if (!upcoming.length) { showEmpty(); return; }
        var limit = parseInt(list.getAttribute("data-limit"), 10);
        if (limit > 0) upcoming = upcoming.slice(0, limit);
        upcoming.forEach(function (ev) { list.appendChild(renderEvent(ev)); });
        list.hidden = false;
        empty.hidden = true;
      })
      .catch(function (err) {
        // Local file:// previews block fetch. Serve the folder over HTTP to see events.
        console.warn("Could not load data/events.json:", err);
        showEmpty();
      });
  }

  /* 4. Founder photos: hide the slot if the file isn't there yet */
  Array.prototype.forEach.call(document.querySelectorAll(".founder__photo img"), function (img) {
    var hide = function () { img.parentNode.hidden = true; };
    img.addEventListener("error", hide);
    if (img.complete && img.naturalWidth === 0) hide();
  });

  /* 5. Form guard */
  var notice = document.getElementById("form-notice");
  if (form && notice) {
    form.addEventListener("submit", function (e) {
      var action = form.getAttribute("action") || "";
      if (action.indexOf("TODO") !== -1) {
        e.preventDefault();
        notice.hidden = false;
        notice.focus();
      }
    });
  }
})();
