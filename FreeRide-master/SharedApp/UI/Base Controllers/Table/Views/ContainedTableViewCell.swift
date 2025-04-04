//
//  ContainedTableViewCell.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 10/07/2023.
//  Copyright © 2023 Circuit. All rights reserved.
//

import UIKit

class ContainedTableViewCell: UITableViewCell {

    init(view embeddedView: UIView) {
        super.init(style: .default, reuseIdentifier: nil)
        embeddedView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(embeddedView)
        NSLayoutConstraint.activate([
            embeddedView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 10),
            embeddedView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            embeddedView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            embeddedView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor),
        ])
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

}
