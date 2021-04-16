import fs from 'fs'
import path from 'path'

export const loadAbi = (name: string): string => {
    return JSON.parse(
        fs.readFileSync(path.join(__dirname, '../../abis', name)).toString()
    )
}
