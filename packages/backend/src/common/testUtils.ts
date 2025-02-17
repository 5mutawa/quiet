import fs from 'fs'
import getPort from 'get-port'
import type { Libp2p } from 'libp2p'
import createHttpsProxyAgent from 'https-proxy-agent'
import path from 'path'
import PeerId from 'peer-id'
import tmp from 'tmp'
import { Config } from '../constants'
import { ConnectionsManager } from '../libp2p/connectionsManager'
import { createCertificatesTestHelper } from '../libp2p/tests/client-server'
import { PermsData } from '@quiet/state-manager'
import { Tor } from '../torManager'
import {
  createLibp2pAddress,
  createLibp2pListenAddress,
  getPorts,
  Ports,
  torBinForPlatform,
  torDirForPlatform
} from './utils'
import crypto from 'crypto'
import logger from '../logger'
import { TorParams } from '../torManager/torManager'
const log = logger('test')

export const rootPermsData: PermsData = {
  certificate:
    'MIIBNjCB3AIBATAKBggqhkjOPQQDAjASMRAwDgYDVQQDEwdaYmF5IENBMCYYEzIwMjEwNjIyMDkzMDEwLjAyNVoYDzIwMzAwMTMxMjMwMDAwWjASMRAwDgYDVQQDEwdaYmF5IENBMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEV5a3Czy+L7IfVX0FpJtSF5mi0GWGrtPqv5+CFSDPrHXijsxWdPTobR1wk8uCLP4sAgUbs/bIleCxQy41kSSyOaMgMB4wDwYDVR0TBAgwBgEB/wIBAzALBgNVHQ8EBAMCAAYwCgYIKoZIzj0EAwIDSQAwRgIhAPOzksuipKyBALt/o8O/XwsrVSzfSHXdAR4dOWThQ1lbAiEAmKqjhsmf50kxWX0ekhbAeCTjcRApXhjnslmJkIFGF2o=+lmBImw3BMNjA0FTlK5iRmVC+w/T6M04Es+yiYL608vOhx2slnoyAwHjAPBgNVHRMECDAGAQH/AgEDMAsGA1UdDwQEAwIABjAKBggqhkjOPQQDAgNIADBFAiEA+0kIz0ny/PLVERTcL0+KCpsztyA6Zuwzj05VW5NMdx0CICgdzf0lg0/2Ksl1AjSPYsy2w+Hn09PGlBnD7TiExBpx',
  privKey:
    'MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgTvNuJL0blaYq6zmFS53WmmOfHshlqn+8wNHDzo4df5WgCgYIKoZIzj0DAQehRANCAARXlrcLPL4vsh9VfQWkm1IXmaLQZYau0+q/n4IVIM+sdeKOzFZ09OhtHXCTy4Is/iwCBRuz9siV4LFDLjWRJLI5+lmBImw3BMNjA0FTlK5iRmVC+w/T6M04Es+yiYL608vOhx2sln'
}

tmp.setGracefulCleanup()

export const testBootstrapMultiaddrs = [
  createLibp2pAddress('abcd.onion', 'QmfLUJcDSLVYnNqSPSRK4mKG8MGw51m9K2v59k3yq1C8s4')
]

export const spawnTorProcess = async (quietDirPath: string, ports?: Ports, extraTorProcessParams?: TorParams, binName?: string): Promise<Tor> => {
  const _ports = ports || (await getPorts())
  const torPath = torBinForPlatform(undefined, binName)
  const libPath = torDirForPlatform()
  const tor = new Tor({
    appDataPath: quietDirPath,
    torPath: torPath,
    httpTunnelPort: _ports.httpTunnelPort,
    options: {
      env: {
        LD_LIBRARY_PATH: libPath,
        HOME: quietDirPath
      },
      detached: true
    },
    extraTorProcessParams
  })
  return tor
}

export const createLibp2p = async (peerId: PeerId): Promise<Libp2p> => {
  const pems = await createCertificatesTestHelper('address1.onion', 'address2.onion')

  const port = await getPort()

  return await ConnectionsManager.createBootstrapNode({
    peerId,
    listenAddresses: [createLibp2pListenAddress('localhost')],
    agent: createHttpsProxyAgent({ port: 1234, host: 'localhost' }),
    localAddress: createLibp2pAddress('localhost', peerId.toString()),
    cert: pems.userCert,
    key: pems.userKey,
    ca: [pems.ca],
    targetPort: port
  })
}

export const createTmpDir = (prefix: string = 'quietTestTmp_'): tmp.DirResult => {
  return tmp.dirSync({ mode: 0o750, prefix, unsafeCleanup: true })
}

export const tmpQuietDirPath = (name: string): string => {
  return path.join(name, Config.QUIET_DIR)
}

export function createFile(filePath: string, size: number) {
  const stream = fs.createWriteStream(filePath)
  const maxChunkSize = 1048576 // 1MB
  if (size < maxChunkSize) {
    stream.write(crypto.randomBytes(size))
  } else {
    const chunks = Math.floor(size / maxChunkSize)
    for (let i = 0; i < chunks; i++) {
      stream.write(crypto.randomBytes(Math.min(size, maxChunkSize)))
      size -= maxChunkSize
    }
  }
  stream.end()
}

export async function createPeerId() {
  const { peerIdFromKeys } = await eval("import('@libp2p/peer-id')")
  const peerId = await PeerId.create()
  // @eslint-ignore
  return peerIdFromKeys(peerId.marshalPubKey(), peerId.marshalPrivKey())
}
