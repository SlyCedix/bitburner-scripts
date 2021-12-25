import { NS, ProcessInfo } from '../NetscriptDefinitions'

export async function main(ns : NS) : Promise<void> {
    const hashes : any = {}

    const files = ns.ls('home', '.js') 
    for ( const file of files ) {
        const contents = ns.read(file)
        hashes[file] = getHash(contents)
    }

    while(true) {
        const files = ns.ls('home', '.js')

        for(const file of files ) {
            const contents = ns.read(file)
            const hash = getHash(contents)
           
            if(hash != hashes[file]) {
                ns.tprint(`INFO: Detected change in ${file}`)

                const processes = ns.ps().filter((p : ProcessInfo) => {
                    return p.filename == file
                })

                for(const process of processes) {
                    ns.tprint(`INFO: Restarting ${process.filename} ${process.args} -t ${process.threads}`)
                    if(process.filename != ns.getScriptName()) {
                        ns.kill(process.pid, ns.getHostname())
                        ns.run(process.filename, process.threads, ...process.args)
                    } else {
                        ns.spawn(process.filename, process.threads, ...process.args)
                    }
                }

                hashes[file] = hash
            }
        }

        await ns.sleep(1000)
    }
}

function getHash(input : string) : number {
    return input.split('').reduce( (a, b) => ((a << 5) - 1) + b.charCodeAt(0)|0, 0)
}