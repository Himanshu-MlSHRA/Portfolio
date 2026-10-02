import { useState } from "react";
import Intro from "../features/intro/Intro";
import Cabinet from "../features/cabinet/Cabinet";

const INTRO_SEEN_KEY = "himanshu-portfolio:intro-seen";

export default function HomeExperience() {
  const [introDone, setIntroDone] = useState(
    () => !!sessionStorage.getItem(INTRO_SEEN_KEY),
  );

  function handleIntroComplete() {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    setIntroDone(true);
  }

  return (
    <>
      {!introDone && <Intro onComplete={handleIntroComplete} />}
      <Cabinet active={introDone} />
    </>
  );
}
