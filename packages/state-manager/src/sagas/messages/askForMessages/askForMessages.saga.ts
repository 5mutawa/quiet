import { PayloadAction } from '@reduxjs/toolkit'
import { Socket, applyEmitParams } from '../../../types'
import { apply } from 'typed-redux-saga'
import { SocketActionTypes } from '../../socket/const/actionTypes'
import { messagesActions } from '../messages.slice'

export function* askForMessagesSaga(
  socket: Socket,
  action: PayloadAction<ReturnType<typeof messagesActions.askForMessages>['payload']>
): Generator {
  yield* apply(
    socket,
    socket.emit,
    applyEmitParams(SocketActionTypes.ASK_FOR_MESSAGES, action.payload)
  )
}
