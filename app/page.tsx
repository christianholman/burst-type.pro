'use client'

import { useEffect, useReducer } from "react"
import wordlist from '../config/wordlist.json'

type Character = {
  character: string;
  correct?: boolean;
}

type Word = {
  characters: Character[];
  startTime?: number;
  endTime?: number;
  wpm?: number;
  hitTargetWPM: boolean;
  match: boolean;
  streak: number;
}

type State = {
  word: Word;
  level: number;
  buffer: string;
  targetWPM: number;
  targetStreak: number;
  finished: boolean;
}

type Action = {
  type: 'SET_TARGET_STREAK';
  payload: number;
} | {
  type: 'SET_TARGET_WPM';
  payload: number;
} | {
  type: 'SET_WORD';
  payload: Word;
} | {
  type: 'SET_CHARACTERS';
  payload: Character[];
}| {
  type: 'APPEND_BUFFER';
  payload: string;
} | {
  type: 'BACKSPACE_BUFFER';
} | {
  type: 'NEXT_LEVEL';
} | {
  type: 'RESET_GAME';
};

const createWord = (raw: string): Word => ({
  characters: raw.toLowerCase().split('').map(character => ({character})),
  match: false,
  hitTargetWPM: false,
  streak: 0,
});

const startingLevel = 0;

const initialState: State = {
  word: createWord(wordlist[startingLevel]),
  level: startingLevel,
  buffer: '',
  targetWPM: 60,
  targetStreak: 1,
  finished: false,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_TARGET_STREAK':
      return {
        ...state,
        targetStreak: action.payload,
      };
    case 'SET_TARGET_WPM':
      return {
        ...state,
        targetWPM: action.payload,
      };
    case 'SET_WORD':
      return {
        ...state,
        word: action.payload,
      };
    case 'SET_CHARACTERS':
      return {
        ...state,
        word: {
          ...state.word,
          characters: action.payload,
        },
      };
    case 'APPEND_BUFFER':
      if (state.word.endTime) {
        return state;
      }

      if (state.buffer.length >= state.word.characters.length) {
        return state;
      }

      return {
        ...state,
        buffer: state.buffer + action.payload,
        word: state.word.startTime ? state.word : {
          ...state.word,
          startTime: Date.now(),
        },
      };
    case 'BACKSPACE_BUFFER':
      if (state.word.endTime) {
        return state;
      }

      return {
        ...state,
        buffer: state.buffer.slice(0, -1),
      };
    case 'NEXT_LEVEL':
      if (state.finished || state.buffer.length === 0) {
        return state;
      }

      if (state.word.endTime === undefined) {
        const wpm = Math.round(60 / ((Date.now() - (state.word.startTime ?? 0)) / 1000));
        const match = state.word.characters.every((character, index) => character.character === state.buffer[index]);
        const hitTargetWPM = wpm >= state.targetWPM;

        return {
          ...state,
          word: {
            ...state.word,
            endTime: Date.now(),
            streak: hitTargetWPM && match ? state.word.streak + 1 : 0,
            wpm,
            match,
            hitTargetWPM,
          },
        };
      }

      if (state.word.wpm === undefined) {
        return state;
      }

      if (!state.word.match || state.word.wpm < state.targetWPM) {
        return {
          ...state,
          word: createWord(wordlist[state.level]),
          buffer: '',
        };
      }

      if (state.word.streak < state.targetStreak) {
        return {
          ...state,
          word: {
            ...createWord(wordlist[state.level]),
            streak: state.word.streak,
          },
          buffer: '',
        };
      }

      if (state.level + 1 === wordlist.length) {
        return {
          ...state,
          level: state.level + 1,
          finished: true,
        };
      }

      return {
        ...state,
        level: state.level + 1,
        word: createWord(wordlist[state.level + 1]),
        buffer: '',
      };
    case 'RESET_GAME':
      return {
        ...initialState,
        targetWPM: state.targetWPM,
      };
    default:
      return state;
  }
};

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.match(/^[a-z]$/)) {
        dispatch({type: 'APPEND_BUFFER', payload: e.key});
      }

      if (e.key === 'Backspace') {
        dispatch({type: 'BACKSPACE_BUFFER'});
      }

      if (e.key === ' ') {
        dispatch({type: 'NEXT_LEVEL'});
      }
    }

    window.addEventListener('keydown', handleKeyPress)

    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, []);

  useEffect(() => {
    const characters = state.word.characters.map((character, index) => ({
      ...character,
      correct: state.buffer[index] === undefined 
        ? undefined 
        : character.character === state.buffer[index],
    }));

    dispatch({type: 'SET_CHARACTERS', payload: characters});
  }, [state.buffer]);

  return (
    <main className="flex items-center justify-center w-full h-screen bg-neutral-900 text-neutral-600">
      {state.finished ? (
        <div className="text-center">
          <h1 className="text-7xl font-bold text-neutral-50">Congrats!</h1>
          <button className="px-4 py-2 mt-8 text-lg font-bold text-green-50 bg-green-700 rounded hover:bg-green-600" onClick={() => dispatch({type: 'RESET_GAME'})}>Play Again</button>
        </div>
      ) : (
        <div className="text-center">
        <p className="text-9xl font-bold tracking-wider">
          {state.word.characters.map((character, index) => (
            <span key={index} className={`${character.correct === undefined ? 'text-neutral-600' : character.correct ? 'text-neutral-100' : 'text-red-600'}`}>
              {character.character}
            </span>
          ))}
        </p>
        <p className={`text-3xl mt-6 ${state.word.wpm === undefined ? 'text-neutral-600' : state.word.match && state.word.wpm >= state.targetWPM ? 'text-green-600' : 'text-red-600'}`}>
          {state.word.wpm !== undefined ? (
            `${state.word.wpm} WPM`
          ) : state.word.startTime ===  undefined ? (
            'N/A'
          ) : (
            '>>>'
          )}
        </p>
        <div className="flex flex-wrap gap-4 justify-center mt-4">
          {Array.from({length: state.targetStreak}).map((_, index) => (
            <div key={index} className={`w-3 h-3 rounded ${index < state.word.streak ? 'bg-green-600' : 'bg-neutral-700'}`}/>
          ))}
        </div>
      </div>
      )}
      <div className="fixed flex flex-wrap justify-center items-center gap-4 top-0 w-full p-10">
        {[30, 60, 90, 120].map((wpm, index) => (
          <button
            key={index}
            className={`flex flex-col items-center w-16 p-2 border-2 rounded-md ${wpm === state.targetWPM ? 'border-green-500 text-green-400 bg-green-950' : 'border-neutral-700 text-neutral-400'}`}
            onClick={() => dispatch({type: 'SET_TARGET_WPM', payload: wpm})}
          >
            <span className="font-bold text-lg">{wpm}</span>
            <span className="text-sm">WPM</span>
          </button>
        ))}
        <div className="h-10 border-l-2 border-neutral-800 mx-4"/>
        {[1, 3, 5, 10].map((streak, index) => (
          <button
            key={index}
            className={`flex flex-col items-center w-16 p-2 border-2 rounded-md ${streak === state.targetStreak ? 'border-blue-500 text-blue-400 bg-blue-950' : 'border-neutral-700 text-neutral-400'}`}
            onClick={() => dispatch({type: 'SET_TARGET_STREAK', payload: streak})}
          >
            <span className="font-bold text-lg">{streak}</span>
            <span className="text-sm">Streak</span>
          </button>
        ))}
      </div>
      <div className="fixed flex flex-wrap gap-1 bottom-0 w-full p-10">
        {wordlist.map((_, index) => (
          <div key={index} className={`w-2 h-2 rounded-full ${index < state.level ? 'bg-green-600' : 'bg-neutral-700'}`}/>
        ))}
      </div>
    </main>
  )
}
