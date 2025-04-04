//
//  MenuTableViewCell.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/21/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class MenuTableViewCell: UITableViewCell {

    @IBOutlet private weak var menuImageView: UIImageView!
    @IBOutlet private weak var nameLabel: Label!

    override func awakeFromNib() {
        super.awakeFromNib()
        nameLabel.style = .menuItemTitle
    }

    func configure(with item: MenuItem) {
        menuImageView.image = item.image
        nameLabel.text = item.title.capitalized
    }
}
