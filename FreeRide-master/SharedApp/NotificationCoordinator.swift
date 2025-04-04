//
//  NotificationCoordinator.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/19/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation
import UserNotifications
import UIKit
import AVFoundation

class NotificationCoordinator {

    enum SoundFile: String {
        case CarHonk
        case Message
        case RideCancelled
        case RideChanged

        var fileType: AVFileType {
            switch self {
            default:
                return .wav
            }
        }

        var ext: String {
            switch self {
            default:
                return "wav"
            }
        }
    }

    private static var audioPlayer: AVAudioPlayer?

    static func requestPermission() {
        let center = UNUserNotificationCenter.current()

        // Request permission to display alerts and play sounds.
        center.requestAuthorization(options: [.alert, .sound, .badge]) { (granted, error) in
            self.checkNotificationPermissions()
        }
    }

    static func checkNotificationPermissions() {
        let center = UNUserNotificationCenter.current()

        center.getNotificationSettings { settings in
            switch settings.authorizationStatus {
            case .authorized:
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            default:
                break
            }
        }
    }

    static func updateDeviceToken() {
        guard let deviceToken = Defaults.deviceToken else {
            return
        }

        let api: ServerAPI
        #if RIDER
        api = RiderAppContext.shared.api
        #elseif DRIVER
        api = DriverAppContext.shared.api
        #endif

        let request = RegisterNotificationsRequest(deviceToken: deviceToken)
        api.registerNotifications(request) { result in
            switch result {
            case .success:
                // Registered
                Defaults.deviceTokenRegistrationFailure = nil
                break
            case .failure(let error):
                Defaults.deviceTokenRegistrationFailure = error.localizedDescription + "(statusCode=\(error.status.rawValue)"
            }
        }
    }

    static func playSound(_ sound: SoundFile) {
        let resource = sound.rawValue
        let fileType = sound.ext

        guard let url = Bundle.main.url(forResource: resource, withExtension: fileType) else {
            return
        }

        do {
            try AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default, options: [])
            try AVAudioSession.sharedInstance().setActive(true)

            audioPlayer = try AVAudioPlayer(contentsOf: url, fileTypeHint: sound.fileType.rawValue)
            audioPlayer?.prepareToPlay()
            audioPlayer?.play()
        } catch let error {
            print(error.localizedDescription)
        }
    }
}
