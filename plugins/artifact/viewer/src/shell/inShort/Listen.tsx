import { useRef, useState } from "react";

import { captionSource } from "./vtt";

type Setter = (value: boolean) => void;

function toggleAudio(element: HTMLAudioElement | null, playing: boolean, setPlaying: Setter) {
  if (element === null) return;
  if (playing) {
    element.pause();
    setPlaying(false);
    return;
  }
  setPlaying(true);
  void Promise.resolve(element.play()).catch(() => setPlaying(false));
}

export function useListen() {
  const [playing, setPlaying] = useState(false);
  const player = useRef<HTMLAudioElement | null>(null);
  const toggle = () => toggleAudio(player.current, playing, setPlaying);
  return { playing, setPlaying, player, toggle };
}

type Listen = ReturnType<typeof useListen>;

interface ListenProps {
  audio: string;
  text: string;
  listen: Listen;
}

function ListenAudio({ audio, text, listen }: ListenProps) {
  const { setPlaying, player } = listen;
  const stop = () => setPlaying(false);
  return (
    <audio ref={player} preload="none" src={audio} onEnded={stop} onPause={stop}>
      <track kind="captions" srcLang="en" label="In Short" src={captionSource(text)} />
    </audio>
  );
}

function ListenButton({ listen }: { listen: Listen }) {
  return (
    <button
      type="button"
      aria-pressed={listen.playing}
      onClick={listen.toggle}
      className="ml-auto shrink-0 cursor-pointer border-0 bg-transparent p-0 font-mono text-[12.5px] text-ink-mid underline-offset-2 hover:underline"
    >
      {listen.playing ? "Pause" : "Listen"}
    </button>
  );
}

export function ListenControls({ audio, text, listen }: ListenProps) {
  return (
    <>
      <ListenAudio audio={audio} text={text} listen={listen} />
      <ListenButton listen={listen} />
    </>
  );
}
