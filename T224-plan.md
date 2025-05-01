# T224: Replace raw wavesurfer.js with @wavesurfer/react

## Implementation Approach

1. Identify all components using the current wavesurfer.js implementation
2. Research @wavesurfer/react API and integration approach
3. Update package.json to include the new dependency
4. Refactor the AudioPlayer component to use @wavesurfer/react
5. Ensure all current functionality is preserved
6. Test for proper lifecycle management and absence of AbortError issues

## Steps

1. Examine current AudioPlayer implementation to understand existing wavesurfer usage
2. Install @wavesurfer/react dependency
3. Refactor AudioPlayer component using React-specific wavesurfer implementation
4. Update any dependent hooks or components
5. Test audio playback functionality
6. Verify no AbortError issues occur during component mounting/unmounting
