// import { NS } from '@ns'
const doc = eval('document')

export function modifyLogStyle(logName: string, style: string, value: string): boolean {
    const titleBar = doc.querySelector(`[title="${logName} "]`)
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

export function createStatDisplay(name: string): Node {
    const extraHookRow = doc.getElementById('overview-extra-hook-0').parentElement.parentElement
    if (extraHookRow == null || extraHookRow == undefined) throw 'ERROR: Could not find extra hook, was it modified?'

    const clonedRow = extraHookRow.cloneNode(true)

    clonedRow.childNodes[0].childNodes[0].id = name + '-hook-0'
    clonedRow.childNodes[0].childNodes[0].innerHTML = name
    clonedRow.childNodes[1].childNodes[0].id = name + '-hook-1'
    clonedRow.childNodes[2].childNodes[0].id = name + '-hook-2'

    return extraHookRow.parentNode.insertBefore(clonedRow, extraHookRow.nextSibling)
}

export function updateStatDisplay(name: string, value: string): boolean {
    const statDisplay: HTMLElement = doc.getElementById(name + '-hook-1')
    if (statDisplay == null || statDisplay == undefined) return false

    statDisplay.innerHTML = value
    return true
}