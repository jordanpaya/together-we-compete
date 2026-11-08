/* Together We Compete — small bits of behavior.
   1. Mobile nav toggle
   3. Load events from data/events.json
   4. Hide founder photo slots whose file is missing
   5. Donation form: opens an email with the details filled in
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

  /* 2b. Time-limited blocks: hide anything with data-until once that day has passed */
  var todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
  Array.prototype.forEach.call(document.querySelectorAll("[data-until]"), function (node) {
    var p = node.getAttribute("data-until").split("-").map(Number);
    var until = new Date(p[0], p[1] - 1, p[2]);
    if (until < todayMid) node.hidden = true;
  });

  /* 2c. Scroll-in reveal for content below the fold (skipped for reduced motion).
     Anything already on screen shows instantly. If the observer never fires, a
     fallback shows everything so nothing can get stuck hidden. */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && "IntersectionObserver" in window) {
    var targets = document.querySelectorAll(".section > .container, .band__inner");
    var ioFired = false;
    var io = new IntersectionObserver(function (entries) {
      ioFired = true;
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    Array.prototype.forEach.call(targets, function (t) {
      if (t.getBoundingClientRect().top < window.innerHeight * 0.95) return; // on screen already
      t.classList.add("reveal");
      io.observe(t);
    });
    setTimeout(function () {
      if (ioFired) return;
      Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function (t) { t.classList.add("is-visible"); });
    }, 3000);
  }

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
    date.setAttribute("datetime", ev.end_date ? ev.date + "/" + ev.end_date : ev.date);
    date.appendChild(el("span", "event__date-month", d.toLocaleDateString("en-US", { month: "short" })));
    date.appendChild(el("span", "event__date-day", String(d.getDate())));
    if (ev.end_date) {
      var e = parseDate(ev.end_date);
      date.appendChild(el("span", "event__date-through",
        "to " + e.toLocaleDateString("en-US", { month: "short" }) + " " + e.getDate()));
    }
    item.appendChild(date);

    var sportLine = ev.sport || "";
    if (ev.start_time) sportLine += (sportLine ? " · " : "") + ev.start_time + (ev.end_time ? "–" + ev.end_time : "");
    item.appendChild(el("p", "event__sport", sportLine));

    item.appendChild(el("h3", "event__title", ev.title));

    var where = ev.location_name || "";
    if (ev.address) where += (where ? ", " : "") + ev.address;
    if (where) item.appendChild(el("p", "event__where", where));
    if (ev.description) item.appendChild(el("p", "event__desc", ev.description));

    var links = el("div", "event__links");
    if (ev.signup_url) {
      var link = el("a", "event__link", ev.signup_label || "Sign up");
      link.href = ev.signup_url;
      link.rel = "noopener";
      links.appendChild(link);
    }
    if (where) {
      var maps = el("a", "event__link", "Directions");
      maps.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(where);
      maps.rel = "noopener";
      links.appendChild(maps);
    }
    var cal = el("a", "event__link", "Add to calendar");
    cal.href = icsHref(ev, where);
    cal.setAttribute("download", (ev.id || "event") + ".ics");
    links.appendChild(cal);
    item.appendChild(links);

    var today = new Date(); today.setHours(0, 0, 0, 0);
    var endD = parseDate(ev.end_date || ev.date);
    if (d <= today && today <= endD) {
      item.classList.add("event--now");
      item.insertBefore(el("span", "event__now", "Happening now"), item.firstChild);
    }
    return item;
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function icsDate(dt) { return "" + dt.getFullYear() + pad(dt.getMonth() + 1) + pad(dt.getDate()); }
  function icsTime(str) {
    // "9:00 AM" -> "090000"
    var m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(str || "");
    if (!m) return null;
    var h = parseInt(m[1], 10) % 12; if (/pm/i.test(m[3])) h += 12;
    return pad(h) + m[2] + "00";
  }
  function icsEscape(t) { return String(t || "").replace(/\\/g, "\\\\").replace(/[,;]/g, function (c) { return "\\" + c; }).replace(/\n/g, "\\n"); }
  function icsHref(ev, where) {
    var start = parseDate(ev.date), end = parseDate(ev.end_date || ev.date);
    var st = icsTime(ev.start_time), et = icsTime(ev.end_time);
    var dtstart, dtend;
    if (st) {
      dtstart = "DTSTART:" + icsDate(start) + "T" + st;
      dtend = "DTEND:" + icsDate(end) + "T" + (et || st);
    } else {
      end.setDate(end.getDate() + 1); // all-day DTEND is exclusive
      dtstart = "DTSTART;VALUE=DATE:" + icsDate(start);
      dtend = "DTEND;VALUE=DATE:" + icsDate(end);
    }
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Together We Compete//Events//EN", "BEGIN:VEVENT",
      "UID:" + (ev.id || Math.random().toString(36).slice(2)) + "@togetherwecompete.org",
      dtstart, dtend, "SUMMARY:" + icsEscape(ev.title)];
    if (where) lines.push("LOCATION:" + icsEscape(where));
    if (ev.description) lines.push("DESCRIPTION:" + icsEscape(ev.description));
    lines.push("END:VEVENT", "END:VCALENDAR");
    return "data:text/calendar;charset=utf-8," + encodeURIComponent(lines.join("\r\n"));
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
          .filter(function (ev) { return ev && ev.date && parseDate(ev.end_date || ev.date) >= today; })
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

  /* 5. Form: open the visitor's email app with the details filled in */
  var notice = document.getElementById("form-notice");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var v = function (n) { var el = form.elements[n]; return el && el.value ? el.value.trim() : ""; };
      var body = [
        "Name: " + v("name"),
        "Email: " + v("email"),
        "Phone: " + (v("phone") || "n/a"),
        "Roughly how many items: " + (v("quantity") || "n/a"),
        "",
        "What I'm donating:",
        v("gear"),
        "",
        "Anything else:",
        v("notes") || "n/a"
      ].join("\n");
      window.location.href = "mailto:support@togetherwecompete.org"
        + "?subject=" + encodeURIComponent("Gear donation from " + v("name"))
        + "&body=" + encodeURIComponent(body);
      if (notice) { notice.hidden = false; notice.focus(); }
    });
  }
})();
