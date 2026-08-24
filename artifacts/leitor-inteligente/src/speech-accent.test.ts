import { describe, expect, it, vi } from 'vitest';
import { getSettings, pronounceTerm } from './pages/study';
import { defaults, storageKey } from './pages/settings';

class FakeUtterance {
  lang = '';

  constructor(readonly text: string) {}
}

describe('sotaque da pronúncia dos cartões', () => {
  it.each(['en-US', 'en-GB'] as const)(
    'envia a preferência %s para a voz ao acionar um cartão',
    (speechAccent) => {
      const storage = {
        getItem: vi.fn((key: string) =>
          key === storageKey ? JSON.stringify({ ...defaults, speechAccent }) : null,
        ),
      };
      const speechSynthesis = {
        cancel: vi.fn(),
        speak: vi.fn(),
      };
      vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);

      pronounceTerm('colour', storage, speechSynthesis);

      expect(storage.getItem).toHaveBeenCalledWith(storageKey);
      expect(speechSynthesis.cancel).toHaveBeenCalledOnce();
      expect(speechSynthesis.speak).toHaveBeenCalledOnce();
      expect(speechSynthesis.speak.mock.calls[0][0]).toMatchObject({
        text: 'colour',
        lang: speechAccent,
      });
    },
  );

  it('mantém americano quando não existe uma preferência guardada', () => {
    const storage = { getItem: vi.fn(() => null) };

    expect(getSettings(storage).speechAccent).toBe('en-US');
  });
});