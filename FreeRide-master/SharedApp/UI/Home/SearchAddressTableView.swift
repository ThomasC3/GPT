//
//  SearchAddressTableView.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/16/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation
import UIKit
import GooglePlaces

protocol SearchAddressTableViewDelegate: AnyObject {

    func didSelect(item: SearchAddressItem, isPickup: Bool)
}

class SearchAddressTableView: CardView {

    lazy var tableView: UITableView = {
        let table = UITableView()
        table.backgroundColor = .clear
        table.separatorStyle = .none
        table.delegate = self
        table.translatesAutoresizingMaskIntoConstraints = false

        return table
    }()

    lazy var dataSource: SearchAddressDataSource = {
        let ds = SearchAddressDataSource()
        ds.registerCellIdentifiers(in: tableView)
        ds.refresh(results: nil, isPickup: false)

        return ds
    }()

    weak var delegate: SearchAddressTableViewDelegate?

    override init() {
        super.init()

        tableView.dataSource = dataSource
        tableView.rowHeight = 52

        addSubview(tableView)
        tableView.pinEdges(to: self, insets: UIEdgeInsets(top: 10, left: 20, bottom: 10, right: 20))

        constrainHeight(200)
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func configure(results: [GMSAutocompletePrediction]?, isPickup: Bool) {
        dataSource.refresh(results: results, isPickup: isPickup)
        tableView.reloadData()
    }
    
}

extension SearchAddressTableView: UITableViewDelegate {

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let item = dataSource.value(at: indexPath)
        delegate?.didSelect(item: item, isPickup: dataSource.isPickup)
    }
}
