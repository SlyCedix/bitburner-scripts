//This file is full of @ts-expect-error due to typescript weirdness with the DOM
//This is pretty much unavoidable without defining objects extremely explicitly
//which I'd rather not do
const doc: Document = eval('document')

export function getLogNode(logName: string): Node | null {
    const titleBar = doc.querySelector(`[title="${logName}"]`)
    if (titleBar == null || titleBar == undefined) return null

    //@ts-expect-error can't be null if the above check passed
    return titleBar.parentNode.parentNode.parentNode
}

/**
 * Modifies one css property of the specified log
 * @param logName name that appears in the tilebar of the log
 * @param style property name of the style to change (hyphen-case)
 * @param value value to change the property to
 * @returns true if the log was found, false otherwise
 */
export function modifyLogStyle(logName: string, style: string, value: string): boolean {
    const log = getLogNode(logName)
    if (log == null) return false

    //@ts-expect-error can't be null if the above check passed
    const paragraphs = log.lastChild.firstChild.firstChild.children

    for (const _p of paragraphs) {
        const p = _p as HTMLElement
        if (p.style.getPropertyValue(style) != value) {
            p.style.setProperty(style, value)
        }
    }
    return true
}

/**
 * Resizes log to a specific size
 * @param logName name that appears in the titlebar of the log
 * @param width width as valid css string
 * @param height height as valid css string
 * @returns true if the log was found, false otherwise
 */
export function resizeLog(logName: string, width: string, height: string): boolean {
    const log = getLogNode(logName)
    if (log == null) return false

    //@ts-expect-error can't be null if the above check passed
    const resizeable = log.lastChild.firstChild as HTMLDivElement

    resizeable.style.width = width
    resizeable.style.height = height
    return true
}

/**
 * Sets the log to the minimum width that can support the last line
 * @param logName name that appears in the titlebar of the log
 * @returns width in pixels of the paragraph element, -1 if the log cannot be found
 */
export function minimizeLogWidth(logName: string): boolean {
    const log = getLogNode(logName)
    if (log == null) return false

    //@ts-expect-error can't be null if the above check passed
    const p = log.lastChild.firstChild.firstChild.lastChild as HTMLParagraphElement
    if (p == null || p == undefined) return false

    p.style.setProperty('display', 'inline', 'important')
    return resizeLog(logName, `${p.offsetWidth + 1}px`, '20%')
}

/**
 * Creates a new node on the stat display directly below charisma
 *
 * New nodes are appended to the top of the custom stats section
 * @param name Name of the hook, will be displayed on the left side
 * @param border Whether a white border exists at the bottom of the display
 * @returns The new HTML node of the element
 */
export function createStatDisplay(name: string, border = true): Node {
    const extraHook = doc.getElementById('overview-extra-hook-0')
    if (extraHook == null || extraHook == undefined) throw 'ERROR: Could not find extra hook, was it modified?'

    //@ts-expect-error
    const extraHookRow = extraHook.parentNode.parentNode

    //@ts-expect-error
    const clonedRow = extraHookRow.cloneNode(true) as HTMLElement

    clonedRow.children[0].children[0].id = name + '-hook-0'
    clonedRow.children[0].children[0].innerHTML = name
    clonedRow.children[1].children[0].id = name + '-hook-1'
    clonedRow.children[2].children[0].id = name + '-hook-2'

    if (!border) {
        //@ts-expect-error won't be null
        clonedRow.children[0].style.setProperty('border-bottom', '0px')
        //@ts-expect-error won't be null
        clonedRow.children[1].style.setProperty('border-bottom', '0px')
    }

    //@ts-expect-error won't be null
    return extraHookRow.parentNode.insertBefore(clonedRow, extraHookRow.nextSibling)
}

/**
 * Places a new value in the specified custom stat display
 * @param name Name of the display to modify
 * @param value value to set the stat display to
 * @returns true if the display was found, false otherwise
 */
export function updateStatDisplay(name: string, value: string): boolean {
    const statDisplay = doc.getElementById(name + '-hook-1')
    if (statDisplay == null || statDisplay == undefined) return false

    statDisplay.innerHTML = value
    return true
}

/**
 * Injects a single command into the terminal
 *
 * Must be on the terminal page for this to function
 * @param command text to be injected into the terminal
 */
export function runTerminalCommand(command: string): void {
    const terminalInput = doc.getElementById('terminal-input') as HTMLInputElement
    if (terminalInput == null) return
    terminalInput.value = command
    const handler = Object.keys(terminalInput)[1]
    const reactHandler = terminalInput[handler as keyof HTMLElement]
    //@ts-expect-error
    reactHandler.onChange({
        target: terminalInput
    })
    //@ts-expect-error
    reactHandler.onKeyDown({
        keyCode: 13,
        preventDefault: () => null
    })
}