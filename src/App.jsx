import { useEffect, useRef, useState } from "react";

const ALARM_DURATION = 30 * 60;

function pad(n) {
  return String(n).padStart(2, "0");
}

function getNextAlarm(time) {
  const [hours, minutes] = time.split(":").map(Number);

  const now = new Date();
  const target = new Date();

  target.setHours(hours, minutes, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime();
}

function formatTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds));

  const minutes = Math.floor(total / 60);
  const secondsLeft = total % 60;

  return `${pad(minutes)}:${pad(secondsLeft)}`;
}

export default function App() {
  const audioRef = useRef(null);

  const alarmTarget = useRef(null);
  const alarmEnd = useRef(null);

  const armedRef = useRef(false);
  const playingRef = useRef(false);

  const audioUrlRef = useRef(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  const [alarmTime, setAlarmTime] = useState("05:00");

  const [fileName, setFileName] = useState("");

  const [fileInfo, setFileInfo] = useState("");

  const [armed, setArmed] = useState(false);

  const [playing, setPlaying] = useState(false);

  const [remaining, setRemaining] =
    useState(ALARM_DURATION);

  const [status, setStatus] =
    useState("Alarm is off");

  /* -----------------------------
     CLOCK
  ----------------------------- */

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /* -----------------------------
     KEEP REFS UPDATED
  ----------------------------- */

  useEffect(() => {
    armedRef.current = armed;
  }, [armed]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  /* -----------------------------
     ALARM LOOP
  ----------------------------- */

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();

      /* Alarm should start */

      if (
        armedRef.current &&
        alarmTarget.current &&
        !playingRef.current &&
        now >= alarmTarget.current
      ) {
        startAlarm();
      }

      /* Alarm currently playing */

      if (
        playingRef.current &&
        alarmEnd.current
      ) {
        const left =
          (alarmEnd.current - now) / 1000;

        setRemaining(Math.max(0, left));

        if (now >= alarmEnd.current) {
          stopAlarm();
        }
      }
    }, 250);

    return () => clearInterval(timer);
  }, []);

  /* -----------------------------
     SELECT AUDIO
  ----------------------------- */

  function chooseFile(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    console.log("========== AUDIO FILE ==========");
    console.log("Name:", file.name);
    console.log("Type:", file.type);
    console.log("Size:", file.size);
    console.log("Size MB:", (file.size / 1024 / 1024).toFixed(2));

    const audio = audioRef.current;

    if (!audio) {
      console.error("Audio element does not exist");
      return;
    }

    /* Destroy previous URL */

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    /* Create new URL */

    const url = URL.createObjectURL(file);

    audioUrlRef.current = url;

    /*
      IMPORTANT:
      Set src directly instead of relying on React.
    */

    audio.pause();

    audio.src = url;

    audio.preload = "auto";

    audio.load();

    setFileName(file.name);

    setFileInfo(
      `${file.type || "unknown type"} • ${(file.size / 1024 / 1024).toFixed(2)} MB`
    );

    setStatus("Song loaded — ready to test");

    console.log("Blob URL:", url);
    console.log("Audio src:", audio.src);
    console.log("Can play MP3:", audio.canPlayType("audio/mpeg"));
    console.log("Can play WebM:", audio.canPlayType("audio/webm"));
    console.log("Can play OGG:", audio.canPlayType("audio/ogg"));
  }

  /* -----------------------------
     TEST MUSIC
  ----------------------------- */

  async function testMusic() {
    const audio = audioRef.current;

    if (!audio || !audio.src) {
      setStatus("Choose a song first");
      return;
    }

    console.log("========== TEST PLAY ==========");

    console.log("src:", audio.src);

    console.log(
      "readyState:",
      audio.readyState
    );

    console.log(
      "networkState:",
      audio.networkState
    );

    console.log(
      "duration:",
      audio.duration
    );

    try {
      audio.pause();

      audio.currentTime = 0;

      audio.loop = true;

      audio.volume = 1;

      /*
        Explicitly reload the selected source.
      */

      audio.load();

      await audio.play();

      console.log("✅ AUDIO PLAYING");

      setPlaying(true);

      playingRef.current = true;

      setArmed(false);

      armedRef.current = false;

      setStatus("🎵 MUSIC PLAYING");

    } catch (error) {

      console.error(
        "❌ AUDIO ERROR:",
        error
      );

      setStatus(
        `${error.name}: ${error.message}`
      );
    }
  }

  /* -----------------------------
     SET ALARM
  ----------------------------- */

  async function setAlarm() {
    const audio = audioRef.current;

    if (!audio || !audio.src) {
      setStatus("Choose a song first");
      return;
    }

    try {

      /*
        IMPORTANT:

        Start audio during the user's
        click.

        Volume is zero, so the user
        doesn't hear it.

        This helps satisfy browser
        autoplay rules.
      */

      audio.loop = true;

      audio.volume = 0;

      audio.currentTime = 0;

      await audio.play();

      const target =
        getNextAlarm(alarmTime);

      alarmTarget.current = target;

      alarmEnd.current = null;

      setRemaining(ALARM_DURATION);

      setArmed(true);

      armedRef.current = true;

      setPlaying(false);

      playingRef.current = false;

      const difference =
        target - Date.now();

      const minutes = Math.floor(
        difference / 60000
      );

      const hours = Math.floor(
        minutes / 60
      );

      const remainingMinutes =
        minutes % 60;

      if (hours > 0) {
        setStatus(
          `ARMED • starts in ${hours}h ${remainingMinutes}m`
        );
      } else {
        setStatus(
          `ARMED • starts in ${Math.max(
            1,
            remainingMinutes
          )}m`
        );
      }

      console.log("Alarm armed for:", new Date(target));

    } catch (error) {

      console.error(
        "Could not prepare alarm:",
        error
      );

      setStatus(
        `${error.name}: ${error.message}`
      );
    }
  }

  /* -----------------------------
     START ACTUAL ALARM
  ----------------------------- */

  function startAlarm() {
    const audio = audioRef.current;

    if (!audio) return;

    console.log("🚨 ALARM STARTED");

    /*
      Audio is already playing.

      We simply make it audible.
    */

    audio.volume = 1;

    audio.loop = true;

    setPlaying(true);

    playingRef.current = true;

    setArmed(false);

    armedRef.current = false;

    alarmTarget.current = null;

    alarmEnd.current =
      Date.now() + ALARM_DURATION * 1000;

    setRemaining(ALARM_DURATION);

    setStatus(
      "🚨 WAKE UP — MUSIC IS PLAYING"
    );
  }

  /* -----------------------------
     STOP AFTER 30 MINUTES
  ----------------------------- */

  function stopAlarm() {
    const audio = audioRef.current;

    if (audio) {
      audio.pause();

      audio.currentTime = 0;

      audio.volume = 0;

      audio.loop = false;
    }

    alarmEnd.current = null;

    setPlaying(false);

    playingRef.current = false;

    setRemaining(ALARM_DURATION);

    setStatus(
      "30 MINUTES COMPLETED"
    );
  }

  /* -----------------------------
     CANCEL ALARM
  ----------------------------- */

  function cancelAlarm() {
    const audio = audioRef.current;

    if (audio) {
      audio.pause();

      audio.currentTime = 0;

      audio.volume = 0;

      audio.loop = false;
    }

    alarmTarget.current = null;

    setArmed(false);

    armedRef.current = false;

    setStatus("Alarm is off");
  }

  /* -----------------------------
     CLEANUP
  ----------------------------- */

  useEffect(() => {
    return () => {

      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (audioUrlRef.current) {
        URL.revokeObjectURL(
          audioUrlRef.current
        );
      }
    };
  }, []);

  return (
    <main
      className={
        playing
          ? "app alarm-active"
          : "app"
      }
    >

      {/* AUDIO ELEMENT */}

      <audio
        ref={audioRef}
        preload="auto"
      />

      <div className="glow glow-one" />

      <div className="glow glow-two" />

      <section className="card">

        {/* HEADER */}

        <div className="brand">

          <div className="brand-icon">
            ◷
          </div>

          <div>
            <h1>
              Wake Music
            </h1>

            <p>
              30-minute wake-up alarm
            </p>
          </div>

        </div>

        {/* CURRENT TIME */}

        <div className="clock">

          {currentTime.toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          )}

        </div>

        {/* ALARM PLAYING */}

        {playing ? (

          <div className="alarm-screen">

            <div className="pulse">
              ♫
            </div>

            <h2>
              WAKE UP
            </h2>

            <p>
              Music is playing.
            </p>

            <div className="countdown">

              {formatTime(
                remaining
              )}

            </div>

            <small>
              Music will stop
              automatically after
              30 minutes.
            </small>

          </div>

        ) : (

          <>

            {/* TIME */}

            <div className="setting">

              <label>
                Wake-up time
              </label>

              <input
                type="time"
                value={alarmTime}
                disabled={armed}
                onChange={(e) =>
                  setAlarmTime(
                    e.target.value
                  )
                }
              />

            </div>

            {/* SONG */}

            <div className="setting">

              <label>
                Your song
              </label>

              <label className="file-picker">

                <span>
                  {fileName ||
                    "Choose an audio file"}
                </span>

                <input
                  type="file"
                  accept="audio/*"
                  onChange={chooseFile}
                  disabled={armed}
                />

              </label>

              {fileInfo && (
                <div
                  style={{
                    marginTop: "7px",
                    fontSize: "11px",
                    color: "#6f788c",
                  }}
                >
                  {fileInfo}
                </div>
              )}

            </div>

            {/* DURATION */}

            <div className="duration">

              <span>
                Music duration
              </span>

              <strong>
                30 MINUTES
              </strong>

            </div>

            {/* STATUS */}

            <div
              className={
                armed
                  ? "status armed"
                  : "status"
              }
            >

              <span className="status-dot" />

              {status}

            </div>

            {/* BUTTON */}

            {!armed ? (

              <button
                className="main-button"
                onClick={setAlarm}
              >
                SET ALARM
              </button>

            ) : (

              <button
                className="secondary-button"
                onClick={cancelAlarm}
              >
                CANCEL BEFORE IT STARTS
              </button>

            )}

            {/* TEST */}

            <button
              className="test-button"
              onClick={testMusic}
            >
              TEST MUSIC NOW
            </button>

          </>

        )}

        <p className="note">

          Keep this webpage open and keep
          the iPad awake overnight for
          reliable browser operation.

        </p>

      </section>

    </main>
  );
}