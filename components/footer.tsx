export default function Footer() {
  return (
    <footer className="mx-auto max-w-screen-lg flex flex-col items-center justify-center space-y-1 p-4 text-center text-sm text-white/70">
      <p>© brainrot publishing, all rights reserved</p>
      <p>
        <a
          href="https://github.com/phrazzld/brainrot-publishing-house"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white underline decoration-dotted hover:decoration-solid transition-colors"
        >
          github
        </a>
      </p>
    </footer>
  )
}
