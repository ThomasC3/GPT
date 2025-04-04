//
//  ServiceHoursView.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/15/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation
import UIKit

class ServiceHoursView: UIView {

    @IBOutlet private weak var titleLabel: Label!
    @IBOutlet private var dayLabels: [Label]!
    @IBOutlet private var hourLabels: [Label]!
    @IBOutlet private var mondayLabel: Label!
    @IBOutlet private var tuesdayLabel: Label!
    @IBOutlet private var wednesdayLabel: Label!
    @IBOutlet private var thursdayLabel: Label!
    @IBOutlet private var fridayLabel: Label!
    @IBOutlet private var saturdayLabel: Label!
    @IBOutlet private var sundayLabel: Label!
    
    override func awakeFromNib() {
        super.awakeFromNib()

        titleLabel.style = .subtitle6bluegray
        constrainHeight(260)
        
        mondayLabel.text = "Monday".localize()
        tuesdayLabel.text = "Tuesday".localize()
        wednesdayLabel.text = "Wednesday".localize()
        thursdayLabel.text = "Thursday".localize()
        fridayLabel.text = "Friday".localize()
        saturdayLabel.text = "Saturday".localize()
        sundayLabel.text = "Sunday".localize()
        
    }

    func configure(with location: LocationResponse) {
        titleLabel.text = location.isUsingServiceTimes ? "Service Hours".localize() : "Normal Service Hours".localize()
        
        let currentDay = Calendar.current.component(.weekday, from: Date())

        hourLabels.forEach {
            let dayString = Location.day(forTag: $0.tag)

            $0.text = location.serviceHoursFormatted(forDay: dayString)
            $0.style = currentDay == $0.tag ? .body5bluegray : .subtitle1darkgray

            if !location.isOpen, currentDay == $0.tag {
                $0.textColor = Theme.Colors.lightRed
            }
        }

        dayLabels.forEach {            
            $0.style = currentDay == $0.tag ? .body5bluegray : .subtitle1darkgray

            if !location.isOpen, currentDay == $0.tag {
                $0.textColor = Theme.Colors.lightRed
            }
        }
    }
}
