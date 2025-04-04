//
//  MessengerViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/17/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit
import Foundation

class MessengerViewController: MSGMessengerViewController {

    var ride: Ride!

    #if RIDER

    private lazy var rider: MessageUser = {
        return MessageUser(displayName: "messages_me".localize(), isSender: true)
    }()

    #elseif DRIVER

    private lazy var rider: MessageUser = {
        return MessageUser(displayName: ride.riderName ?? "Rider", isSender: false)
    }()

    #endif

    private var messages = [MSGMessage]()

    override func viewDidLoad() {
        super.viewDidLoad()

        dataSource = self

        #if DRIVER

        messageInputView.isHidden = true

        Notification.addObserver(self, name: .shouldUpdateRideMessages, selector: #selector(updateMessages))

        #endif

        title = "Messages".localize()

        navigationItem.leftBarButtonItem = UIBarButtonItem(image: #imageLiteral(resourceName: "round_keyboard_backspace_black_48pt"), style: .done, target: self, action: #selector(dismissAction))
        navigationItem.rightBarButtonItem = UIBarButtonItem(image: #imageLiteral(resourceName: "baseline_call_black_36pt"), style: .done, target: self, action: #selector(callAction))

        navigationItem.leftBarButtonItem?.tintColor = Theme.Colors.seaFoam
        navigationItem.rightBarButtonItem?.tintColor = Theme.Colors.seaFoam
        
        ProgressHUD.show()
        updateMessages()
    }

    #if RIDER

    override func inputViewPrimaryActionTriggered(inputView: MSGInputView) {
        super.inputViewPrimaryActionTriggered(inputView: inputView)

        let text = inputView.message.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !text.isEmpty else {
            return
        }

        let emitter = RideMessageEmitter(ride: ride.id, message: text)
        context.socket.emit(emitter)

        messages.append(MSGMessage(id: messages.count, body: MSGMessageBody.text(text), user: rider, sentAt: Date()))

        collectionView.reloadData()
    }

    #endif

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)

        #if RIDER

        if Defaults.hasSeenDriverMessagePrompt != ride.id {
            let confirm = UIAlertAction(title: "messages_I_understand".localize(), style: .default) { _ in
                Defaults.hasSeenDriverMessagePrompt = self.ride.id
            }

            presentAlert("messages_driver_comm".localize(), message: "messages_driver_comm_info".localize(), cancel: nil, confirm: confirm)
        }

        #endif
    }

    @objc private func dismissAction() {
        dismiss(animated: true)
    }

    @objc private func updateMessages() {
        let query = RideQuery(id: ride.id)
        context.api.getRide(query) { result in
            ProgressHUD.dismiss()

            switch result {
            case .success(let response):
                self.messages = self.mapMessages(response.requestMessages ?? [])
                self.collectionView.reloadData()
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }

    @objc private func callAction() {
        #if RIDER

        let confirm = UIAlertAction(title: "general_yes".localize(), style: .default) { _ in
            let emitter = RiderRequestCallEmitter(ride: self.ride.id)
            self.context.socket.emit(emitter)
        }

        presentAlert("messages_request_call".localize(), message: "messages_request_call_info".localize(), cancel: "general_no".localize(), confirm: confirm)

        #elseif DRIVER

        call(rideID: ride.id)

        #endif
    }

    #if DRIVER

    private func call(rideID: String) {
        guard let phone = context.dataStore.fetchAction(rideId: rideID)?.riderPhone else {
            return
        }

        if let url = URL(string: "tel://\(phone)") {
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url)
            } else {
                presentAlert("Phone Unavailable", message: "This device is unable to call the mobile phone number: \(phone)")
            }
        }
    }

    #endif

    private func mapMessages(_ rideMessages: [RideResponse.Message]) -> [MSGMessage] {
        return rideMessages.enumerated().map { (index, message) in
            var riderName: String {
                if message.sender == "RIDER" {
                    #if DRIVER
                    return ride.riderName ?? "Rider"
                    #else
                    return "messages_me".localize()
                    #endif
                } else {
                    #if DRIVER
                    return "Me"
                    #else
                    return ride.driverName
                    #endif
                }
            }

            var isSender: Bool {
                #if RIDER
                return message.sender == "RIDER"
                #else
                return message.sender == "DRIVER"
                #endif
            }

            return MSGMessage(id: index, body: MSGMessageBody.text(message.message), user: rider, sentAt: message.createdTimestamp)
        }
    }
}

extension MessengerViewController: MSGDataSource {

    func numberOfSections() -> Int {
        return messages.isEmpty ? 0 : 1
    }

    func numberOfMessages(in section: Int) -> Int {
        return messages.count
    }

    func message(for indexPath: IndexPath) -> MSGMessage {
        guard indexPath.item < messages.count else {
            return MSGMessage(id: 0, body: MSGMessageBody.text(""), user: MessageUser(displayName: "", isSender: false), sentAt: Date())
        }

        let message = messages[indexPath.item]
        return message
    }

    func footerTitle(for section: Int) -> String? {
        return ""
    }

    func headerTitle(for section: Int) -> String? {
        #if RIDER

        return "messages_me".localize()

        #elseif DRIVER

        return ride.riderName ?? "Rider"

        #endif
    }
}
