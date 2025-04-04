//
//  WaitingRideBottomView.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/20/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

protocol WaitingRideBottomViewDelegate: AnyObject {
    func didSelectContact()
    func didSelectCancel()
}

class WaitingRideBottomView: BottomCardView {

    @IBOutlet private weak var topSpacer: UIView!
    @IBOutlet private weak var poolingLabel: Label!
    @IBOutlet private weak var driverPhotoImageView: UIImageView!
    @IBOutlet private weak var driverLabel: Label!
    @IBOutlet private weak var driverLicensePlateLabel: Label!
    @IBOutlet private weak var statusLabel: Label!
    @IBOutlet private weak var contactButton: Button!
    @IBOutlet private weak var cancelButton: Button!
    @IBOutlet private weak var infoLabel: Label!
    @IBOutlet private weak var topStackView: UIStackView!
    @IBOutlet private weak var carImageView: UIImageView!
    
    private var currentETA : Float?

    private let imageLoader = ImageLoader()

    private let driverArrivedStatus = "ride_driver_arrived".localize()

    weak var delegate: WaitingRideBottomViewDelegate?
    
    override func awakeFromNib() {
        super.awakeFromNib()
        
        constrainHeight(250)
        
        driverLabel.style = .body3bluegray
        statusLabel.style = .subtitle2darkgray
        statusLabel.text = ""
        poolingLabel.style = .subtitle2darkgray
        poolingLabel.text = ""
        contactButton.style = .primary
        cancelButton.style = .cancel
        infoLabel.style = .subtitle3blue
        infoLabel.text = ""
        cancelButton.setTitle("Cancel Ride".localize(), for: .normal)
        contactButton.setTitle("ride_contact_driver".localize(), for: .normal)
        
        topStackView.layer.borderWidth = 1
        topStackView.layer.borderColor = Theme.Colors.lightGray.cgColor
        topStackView.cornerRadius = 16

        if let descriptor = driverLicensePlateLabel.font.fontDescriptor.withDesign(.rounded) {
            driverLicensePlateLabel.font = UIFont(descriptor: descriptor, size: 16)
        }
        driverLicensePlateLabel.edgeInsets = .init(top: 0, left: 8, bottom: 0, right: 8)
        driverLicensePlateLabel.layer.cornerRadius = 8
        driverLicensePlateLabel.layer.masksToBounds = true
        driverLicensePlateLabel.isHidden = true

        driverPhotoImageView.layer.cornerRadius = 8
        driverPhotoImageView.layer.masksToBounds = true
        driverPhotoImageView.isHidden = true

        carImageView.isHidden = false
    }

    func configure(with ride: Ride) {
        setUIforState(showingDriver: true)
        driverLabel.text = ride.driverName.capitalized
        infoLabel.style = .subtitle3blue
        infoLabel.isHidden = true

        if let licensePlate = ride.licensePlate, !licensePlate.trim().isEmpty {
            driverLicensePlateLabel.text = licensePlate
            driverLicensePlateLabel.isHidden = false
            carImageView.isHidden = true
        } else {
            driverLicensePlateLabel.isHidden = true
            carImageView.isHidden = false
        }

        if let driverPhoto = ride.driverPhoto, !driverPhoto.trim().isEmpty, let driverPhotoURL = URL(string: driverPhoto) {
            driverPhotoImageView.image = UIImage(systemName: "person.crop.circle.fill")
            imageLoader.loadImage(from: driverPhotoURL, into: driverPhotoImageView)
            driverPhotoImageView.isHidden = false
        } else {
            driverPhotoImageView.isHidden = true
        }
        
        if ride.isInQueue {
            statusLabel.text = "ride_is_finishing_ride".localize()
        } else if ride.isDriverEnRoute {
            statusLabel.text = "ride_driver_on_the_way".localize()
        } else {
            self.updateArrivalStatus(with: ride.status == .driverArrived ? ride.driverArrivedTimestamp : nil)

        }
    }

    func update(eta: Float?, isPooling: Bool? = nil) {

        currentETA = eta
        
        infoLabel.isHidden = false
        infoLabel.style = .body3bluegray
        
        if isPooling ?? false {
            poolingLabel.isHidden = false
            poolingLabel.text = "ride_pooling_tag".localize()
        } else {
            poolingLabel.isHidden = true
        }
        
        guard let eta = eta else {
            return
        }
        
        if statusLabel.text != driverArrivedStatus {
            if eta < 1 {
                infoLabel.text = "\("ride_eta_info".localize()) \("ride_eta_less_one_minute".localize())"
            } else if eta == 1 {
                infoLabel.text = "\("ride_eta_info".localize()) \("ride_eta_one_minute".localize())"
            } else {
                infoLabel.text = "\("ride_eta_info".localize()) \(Int(eta)) \("ride_eta_minutes".localize())"
            }
        }
    }
    
    func updateArrivalStatus(with driverArrivedTime: Date?) {
        setUIforState(showingDriver: true)
        
        guard let arrivalTime = driverArrivedTime else {
            infoLabel.isHidden = true
            return
        }
        
        infoLabel.isHidden = false
        infoLabel.style = .subtitle3blue
        statusLabel.text = driverArrivedStatus
        infoLabel.text = "ride_meet_your_driver_now".localize()
        
        let timeSinceArrival = Int((Date().timeIntervalSince(arrivalTime)) / 60)
        let timeLeft = 3 - timeSinceArrival
        
        if timeLeft > 0 && timeLeft < 4 {
            infoLabel.text = "\("ride_meet_your_driver".localize()) \(3 - timeSinceArrival) \("ride_meet_your_driver_minute".localize())\((3 - timeSinceArrival) == 1 ? "" : "s")"
        } else {
            infoLabel.text = "ride_meet_your_driver_now".localize()
        }
    }
    
    func getCurrentETA() -> Float? {
        return currentETA
    }
    
    func setUIforState(showingDriver: Bool) {
        topStackView.isHidden = !showingDriver
        contactButton.isHidden = !showingDriver
        topSpacer.isHidden = showingDriver
    }

    @IBAction private func contactAction() {
        delegate?.didSelectContact()
    }

    @IBAction private func cancelAction() {
        delegate?.didSelectCancel()
    }

}
