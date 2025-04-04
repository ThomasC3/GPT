//
//  HeaderOptionTableView.swift
//  FreeRide
//
//  Created by Rui Magalhães on 05/12/2019.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class HeaderOptionView: UIView {

    @IBOutlet weak var titleLabel: Label!
        
    func configure(with title: String) {
        titleLabel.text = title
    }

}
