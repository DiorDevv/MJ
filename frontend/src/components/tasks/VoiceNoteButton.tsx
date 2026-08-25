import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Mic } from 'lucide-react'
import { fetchTaskVoiceNote } from '../../api/tasks'
import { showErrorToast } from '../../utils/toast'
import { cn } from '../../utils/cn'

interface VoiceNoteButtonProps {
  taskId: string
  className?: string
}

/** Plays the original Telegram voice note a task was quick-added from (see the
 * bot's telegram_bot/handlers/quick_add.py) — lets you double-check what was
 * actually said if the transcribed title looks off. Fetched lazily (not preloaded
 * for every row) and cached in an object URL for the lifetime of this button. */
export function VoiceNoteButton({ taskId, className }: VoiceNoteButtonProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    },
    [],
  )

  const handleClick = async (event: React.MouseEvent) => {
    event.stopPropagation()

    if (audioRef.current) {
      void audioRef.current.play()
      return
    }

    setIsLoading(true)
    try {
      const blob = await fetchTaskVoiceNote(taskId)
      if (blob.size === 0) {
        // A recording that failed to save fully (see the bot's download_voice_bytes)
        // — nothing to decode, and playback would otherwise hang forever waiting
        // for data that will never arrive rather than erroring out.
        throw new Error('Empty voice note')
      }
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      // A malformed/undecodable file can leave the media element stuck at
      // HAVE_NOTHING indefinitely without ever firing 'error' or settling the
      // play() promise — race it against a timeout so the button always recovers.
      await Promise.race([
        audio.play(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Voice note playback timed out')), 8000),
        ),
      ])
    } catch {
      audioRef.current = null
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      showErrorToast(t('tasks.voiceNoteError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => void handleClick(event)}
      aria-label={t('tasks.playVoiceNote')}
      title={t('tasks.playVoiceNote')}
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded text-accent transition-colors hover:bg-accent-subtle',
        className,
      )}
    >
      {isLoading ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Mic className="size-3.5" aria-hidden="true" />
      )}
    </button>
  )
}
