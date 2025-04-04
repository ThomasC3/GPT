//
//  RiderSocket.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import SocketIO

protocol RiderSocketDelegate: SocketDelegate {
    func listenRequestFailed(_ response: SocketErrorResponse)
    func listenRequestCompleted(_ response: RequestCompleted)
    func listenRideUpdatesResponse(_ response: RideUpdatesResponse)
    func listenRideDriverMoved(_ response: RideDriverMoved)
}

class RiderSocket: Socket {

    weak var delegate: RiderSocketDelegate?

    init() {
        if let accessToken = KeychainManager.shared.getAccessToken() {
            super.init(connectParams: .connectParams(["token": accessToken]))
        } else {
            super.init(connectParams: nil)
        }
    }

    override func connect() {
        guard KeychainManager.shared.getAccessToken() != nil else {
            return disconnect()
        }

        super.connect()
    }
    
    override func addHandlers() {
        super.addHandlers()

        addListener(success: RequestCompleted.self, successCompletion: { response in
            self.handleSocketEventReceived()
            self.delegate?.listenRequestCompleted(response)
        }) { failure in
            self.handleSocketEventReceived()
            self.delegate?.listenRequestFailed(failure)
        }

        addListener(success: RideUpdatesResponse.self, successCompletion: { response in
            self.handleSocketEventReceived()
            self.delegate?.listenRideUpdatesResponse(response)
        })

        addListener(success: RideDriverMoved.self, successCompletion: { response in
            self.handleSocketEventReceived()
            self.delegate?.listenRideDriverMoved(response)
        })
    }

    override func handleSocketConnection() {
        self.delegate?.listenSocketConnected()
    }

    override func handleSocketDisconnection() {
        self.delegate?.listenSocketDisconnected()
    }

    override func handleSocketReconnection() {
        self.delegate?.listenSocketReconnecting()
    }

    override func handleSocketError() {
        self.delegate?.listenSocketError()
    }

    override func handleSocketEventReceived() {
        self.delegate?.listenSocketEventReceived()
    }

}
