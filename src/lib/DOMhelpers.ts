// import { NS } from '@ns'
const doc = eval('document')

/**
 * Modifies one css property of the specified log
 * @param logName name that appears in the tilebar of the log
 * @param style property name of the style to change (hyphen-case)
 * @param value value to change the property to
 * @returns true if the log was found, false otherwise
 */
export function modifyLogStyle(logName: string, style: string, value: string): boolean {
    const titleBar = doc.querySelector(`[title="${logName}"]`)
    if (titleBar == null || titleBar == undefined) return false

    const paragraphs = titleBar.parentNode.parentNode.parentNode
        .lastChild.firstChild.firstChild.childNodes

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
    const titleBar = doc.querySelector(`[title="${logName}"]`)
    if (titleBar == null || titleBar == undefined) return false

    const resizeable = titleBar.parentNode.parentNode.parentNode
        .lastChild.firstChild

    resizeable.style.width = width
    resizeable.style.height = height
    return true
}

/**
 * Sets the log to the minimum width that can support the last line
 * @param logName name that appears in the titlebar of the log
 * @returns width in pixels of the paragraph element, -1 if the log cannot be found
 */
export function minimizeLogWidth(logName: string): number {
    const titleBar = doc.querySelector(`[title="${logName}"]`)
    if (titleBar == null || titleBar == undefined) return false

    const p = titleBar.parentNode.parentNode.parentNode
        .lastChild.firstChild.firstChild.lastChild
    if (p == null || p == undefined) return false

    p.style.setProperty('display', 'inline', 'important')
    return resizeLog(logName, `${p.offsetWidth + 1}px`, 'auto')
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
    const extraHookRow = doc.getElementById('overview-extra-hook-0').parentElement.parentElement
    if (extraHookRow == null || extraHookRow == undefined) throw 'ERROR: Could not find extra hook, was it modified?'

    const clonedRow = extraHookRow.cloneNode(true)

    clonedRow.childNodes[0].childNodes[0].id = name + '-hook-0'
    clonedRow.childNodes[0].childNodes[0].innerHTML = name
    clonedRow.childNodes[1].childNodes[0].id = name + '-hook-1'
    clonedRow.childNodes[2].childNodes[0].id = name + '-hook-2'

    if (!border) {
        clonedRow.childNodes[0].style.setProperty('border-bottom', '0px')
        clonedRow.childNodes[1].style.setProperty('border-bottom', '0px')
    }


    return extraHookRow.parentNode.insertBefore(clonedRow, extraHookRow.nextSibling)
}

/**
 * Places a new value in the specified custom stat display
 * @param name Name of the display to modify
 * @param value value to set the stat display to
 * @returns true if the display was found, false otherwise
 */
export function updateStatDisplay(name: string, value: string): boolean {
    const statDisplay: HTMLElement = doc.getElementById(name + '-hook-1')
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
    const terminalInput = doc.getElementById('terminal-input')
    terminalInput.value = command
    const handler = Object.keys(terminalInput)[1]
    terminalInput[handler].onChange({
        target: terminalInput
    })
    terminalInput[handler].onKeyDown({
        keyCode: 13,
        preventDefault: () => null
    })
}